import type { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";
import { Server as SocketIOServer, Socket } from "socket.io";
import z from "zod";
import {
  CALL_SIGNAL_MAX_PAYLOAD_BYTES,
  CORS_ORIGINS,
  JWT_ALGORITHM,
  JWT_AUDIENCE,
  JWT_ISSUER,
  JWT_PUBLIC_KEY,
} from "../configs";
import { CallService, callSignalTypes } from "../services/call.service";
import { DirectMessageService } from "../services/direct-message.service";
import { UserRepository } from "../repositories/user.repository";

let io: SocketIOServer | null = null;

const directMessageService = new DirectMessageService();
const callService = new CallService();
const userRepository = new UserRepository();

interface AuthTokenPayload extends jwt.JwtPayload {
  id: string;
  sid?: string;
  tokenType?: string;
}

type SocketMessagePayload = {
  _id: string;
  pairKey: string;
  participants: string[];
  sender: string;
  recipient: string;
  content: string;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

type DirectMessageEventPayload = {
  senderUserId: string;
  recipientUserId: string;
  pairKey: string;
  message: SocketMessagePayload;
};

type ConversationReadEventPayload = {
  readerUserId: string;
  otherUserId: string;
  pairKey: string;
  updatedCount: number;
};

type CallLifecycleEventPayload = {
  call: Record<string, unknown>;
  actorUserId: string;
  recipientUserId: string;
};

type CallSignalEventPayload = {
  callId: string;
  callerUserId: string;
  calleeUserId: string;
  signalType: (typeof callSignalTypes)[number];
  payload: unknown;
};

type AuthenticatedSocket = Socket<
  Record<string, never>,
  Record<string, never>,
  Record<string, never>,
  {
    userId: string;
    sessionId: string;
  }
>;

const getUserRoom = (userId: string) => `user:${userId}`;

const extractSocketToken = (socket: Socket) => {
  const authToken = socket.handshake.auth?.token;
  if (typeof authToken === "string" && authToken.trim()) {
    return authToken.trim();
  }

  const authorizationHeader = socket.handshake.headers.authorization;
  if (typeof authorizationHeader === "string" && authorizationHeader.startsWith("Bearer ")) {
    return authorizationHeader.slice("Bearer ".length).trim();
  }

  return "";
};

const sendMessageSocketDto = z.object({
  friendUserId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid identifier"),
  content: z.string().trim().min(1).max(2000),
});

const markReadSocketDto = z.object({
  friendUserId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid identifier"),
});

const callSignalSocketDto = z.object({
  callId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid identifier"),
  signalType: z.enum(callSignalTypes),
  payload: z.unknown(),
});

const verifySocketAccessToken = async (token: string) => {
  if (!JWT_PUBLIC_KEY) {
    throw new Error("JWT public key is not configured on the server");
  }

  const decodedToken = jwt.verify(token, JWT_PUBLIC_KEY, {
    algorithms: [JWT_ALGORITHM],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  }) as AuthTokenPayload;

  if (!decodedToken.id || decodedToken.tokenType !== "access" || !decodedToken.sid) {
    throw new Error("Authorization token could not be verified");
  }

  const user = await userRepository.getUserById(decodedToken.id);
  if (!user || user.isBanned) {
    throw new Error("Authorized user was not found");
  }

  return {
    userId: decodedToken.id,
    sessionId: decodedToken.sid,
  };
};

export const emitDirectMessageCreated = (payload: DirectMessageEventPayload) => {
  if (!io) {
    return;
  }

  io.to(getUserRoom(payload.senderUserId))
    .to(getUserRoom(payload.recipientUserId))
    .emit("chat:message", payload);
};

export const emitConversationRead = (payload: ConversationReadEventPayload) => {
  if (!io) {
    return;
  }

  io.to(getUserRoom(payload.readerUserId))
    .to(getUserRoom(payload.otherUserId))
    .emit("chat:conversation-read", payload);
};

export const emitCallIncoming = (payload: CallLifecycleEventPayload) => {
  if (!io) {
    return;
  }

  io.to(getUserRoom(payload.recipientUserId)).emit("call:incoming", payload);
  io.to(getUserRoom(payload.actorUserId)).emit("call:outgoing", payload);
};

export const emitCallAccepted = (payload: CallLifecycleEventPayload) => {
  if (!io) {
    return;
  }

  io.to(getUserRoom(payload.actorUserId))
    .to(getUserRoom(payload.recipientUserId))
    .emit("call:accepted", payload);
};

export const emitCallDeclined = (payload: CallLifecycleEventPayload) => {
  if (!io) {
    return;
  }

  io.to(getUserRoom(payload.actorUserId))
    .to(getUserRoom(payload.recipientUserId))
    .emit("call:declined", payload);
};

export const emitCallEnded = (payload: CallLifecycleEventPayload) => {
  if (!io) {
    return;
  }

  io.to(getUserRoom(payload.actorUserId))
    .to(getUserRoom(payload.recipientUserId))
    .emit("call:ended", payload);
};

export const emitCallSignal = (recipientUserId: string, payload: CallSignalEventPayload) => {
  if (!io) {
    return;
  }

  io.to(getUserRoom(recipientUserId)).emit("call:signal", payload);
};

export const initSocket = (server: HttpServer): SocketIOServer => {
  if (io) {
    return io;
  }

  io = new SocketIOServer(server, {
    cors: {
      origin: CORS_ORIGINS,
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = extractSocketToken(socket);
      if (!token) {
        return next(new Error("Authorization token is required"));
      }

      const authState = await verifySocketAccessToken(token);
      (socket as AuthenticatedSocket).data.userId = authState.userId;
      (socket as AuthenticatedSocket).data.sessionId = authState.sessionId;
      return next();
    } catch {
      return next(new Error("Invalid or expired authorization token"));
    }
  });

  io.on("connection", (socket) => {
    const authenticatedSocket = socket as AuthenticatedSocket;
    const { userId } = authenticatedSocket.data;

    authenticatedSocket.join(getUserRoom(userId));
    console.log(`Socket connected: ${socket.id} (user: ${userId})`);

    authenticatedSocket.on("chat:send-message", async (payload, acknowledge) => {
      try {
        const parsedPayload = sendMessageSocketDto.parse(payload);
        const result = await directMessageService.sendMessage(
          userId,
          parsedPayload.friendUserId,
          { content: parsedPayload.content },
          {
            ipAddress: socket.handshake.address,
            userAgent:
              typeof socket.handshake.headers["user-agent"] === "string"
                ? socket.handshake.headers["user-agent"]
                : undefined,
          }
        );

        emitDirectMessageCreated({
          senderUserId: userId,
          recipientUserId: result.recipientUserId,
          pairKey: result.pairKey,
          message: result.message as SocketMessagePayload,
        });

        if (typeof acknowledge === "function") {
          acknowledge({ success: true, data: result });
        }
      } catch (error) {
        if (typeof acknowledge === "function") {
          acknowledge({
            success: false,
            message: error instanceof Error ? error.message : "Unable to send message",
          });
        }
      }
    });

    authenticatedSocket.on("chat:mark-read", async (payload, acknowledge) => {
      try {
        const parsedPayload = markReadSocketDto.parse(payload);
        const result = await directMessageService.markConversationRead(
          userId,
          parsedPayload.friendUserId,
          {
            ipAddress: socket.handshake.address,
            userAgent:
              typeof socket.handshake.headers["user-agent"] === "string"
                ? socket.handshake.headers["user-agent"]
                : undefined,
          }
        );

        emitConversationRead({
          readerUserId: userId,
          otherUserId: parsedPayload.friendUserId,
          pairKey: result.pairKey,
          updatedCount: result.updatedCount,
        });

        if (typeof acknowledge === "function") {
          acknowledge({ success: true, data: result });
        }
      } catch (error) {
        if (typeof acknowledge === "function") {
          acknowledge({
            success: false,
            message:
              error instanceof Error ? error.message : "Unable to mark conversation as read",
          });
        }
      }
    });

    authenticatedSocket.on("call:signal", async (payload, acknowledge) => {
      try {
        const parsedPayload = callSignalSocketDto.parse(payload);
        const payloadSize = Buffer.byteLength(
          JSON.stringify(parsedPayload.payload),
          "utf8"
        );

        if (payloadSize > CALL_SIGNAL_MAX_PAYLOAD_BYTES) {
          throw new Error("Signal payload is too large.");
        }

        const authorizedSignal = await callService.authorizeSignalRelay({
          actorUserId: userId,
          actorSessionId: authenticatedSocket.data.sessionId,
          callId: parsedPayload.callId,
          signalType: parsedPayload.signalType,
          payload: parsedPayload.payload,
        });

        emitCallSignal(authorizedSignal.recipientUserId, {
          callId: authorizedSignal.callId,
          callerUserId: authorizedSignal.callerUserId,
          calleeUserId: authorizedSignal.calleeUserId,
          signalType: authorizedSignal.signalType,
          payload: authorizedSignal.payload,
        });

        if (typeof acknowledge === "function") {
          acknowledge({ success: true });
        }
      } catch (error) {
        if (typeof acknowledge === "function") {
          acknowledge({
            success: false,
            message:
              error instanceof Error ? error.message : "Unable to relay call signal",
          });
        }
      }
    });

    authenticatedSocket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id} (user: ${userId})`);
    });
  });

  return io;
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error("Socket.IO has not been initialized yet.");
  }

  return io;
};
