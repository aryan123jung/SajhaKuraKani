"use client";

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { toast } from "react-toastify";
import type { AuthUser } from "@/lib/api/auth";
import type {
  CallParticipantProfile,
  CallSession,
  CallSignalType,
  CallType,
} from "@/lib/call-types";

type CallCenterProps = {
  currentUser: AuthUser | null;
};

type IncomingSocketPayload = {
  call: CallSession;
  actorUserId: string;
  recipientUserId: string;
};

type CallSignalPayload = {
  callId: string;
  callerUserId: string;
  calleeUserId: string;
  signalType: CallSignalType;
  payload: unknown;
};

type StartCallEventDetail = {
  callee: CallParticipantProfile;
  callType: CallType;
};

declare global {
  interface WindowEventMap {
    "sajha-call:start": CustomEvent<StartCallEventDetail>;
  }
}

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || "https://localhost:5050";
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
const ACTIVE_CALL_SYNC_INTERVAL_MS = 3000;
const ICE_SERVERS: RTCIceServer[] = [
  {
    urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"],
  },
];

const getDisplayName = (user?: Partial<CallParticipantProfile> | null) => {
  if (!user) {
    return "Unknown user";
  }

  const fullName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  if (fullName) {
    return fullName;
  }

  if (user.username) {
    return `@${user.username}`;
  }

  return "Unknown user";
};

const getInitials = (user?: Partial<CallParticipantProfile> | null) => {
  const initials = `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`.toUpperCase();
  if (initials) {
    return initials;
  }

  if (user?.username) {
    return user.username.slice(0, 2).toUpperCase();
  }

  return "SK";
};

const isAbsoluteUrl = (value: string) => /^https?:\/\//i.test(value);

const normalizeParticipantProfile = (
  user?: CallSession["otherUser"] | CallSession["caller"] | CallSession["callee"] | null
) => {
  if (!user || !("firstName" in user && "lastName" in user && "username" in user)) {
    return user ?? null;
  }

  let profileUrl = user.profileUrl ?? null;

  if (profileUrl && !isAbsoluteUrl(profileUrl)) {
    if (profileUrl.startsWith("/uploads/")) {
      profileUrl = API_BASE_URL ? `${API_BASE_URL}${profileUrl}` : profileUrl;
    } else {
      const assetPath = `/uploads/profile/${profileUrl.replace(/^\/+/, "")}`;
      profileUrl = API_BASE_URL ? `${API_BASE_URL}${assetPath}` : assetPath;
    }
  }

  return {
    ...user,
    profileUrl,
  };
};

const normalizeCallSession = (call: CallSession): CallSession => ({
  ...call,
  caller: normalizeParticipantProfile(call.caller) ?? call.caller,
  callee: normalizeParticipantProfile(call.callee) ?? call.callee,
  otherUser: normalizeParticipantProfile(call.otherUser) ?? call.otherUser,
});

const isParticipantProfile = (
  user?: CallSession["otherUser"] | CallSession["caller"] | CallSession["callee"] | null
): user is CallParticipantProfile =>
  Boolean(user && "firstName" in user && "lastName" in user && "username" in user);

const setMediaElementStream = (
  element: HTMLMediaElement | null,
  stream: MediaStream | null
) => {
  if (!element) {
    return;
  }

  if (element.srcObject !== stream) {
    element.srcObject = stream;
  }

  if (stream) {
    void element.play().catch(() => {
      return;
    });
  }
};

const PhoneIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 16.5v2a2 2 0 0 1-2.2 2 19.7 19.7 0 0 1-8.58-3.06 19.4 19.4 0 0 1-6-6A19.7 19.7 0 0 1 1.16 2.8 2 2 0 0 1 3.15.6h2a2 2 0 0 1 2 1.72l.43 3.02a2 2 0 0 1-.58 1.72l-1.28 1.28a16 16 0 0 0 6 6L13 13a2 2 0 0 1 1.72-.58l3.02.43A2 2 0 0 1 21 16.5Z"
    />
  </svg>
);

const VideoIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5 20 7v10l-5-3.5" />
    <rect x="3" y="6" width="12" height="12" rx="3" />
  </svg>
);

const MicIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 10.5a7 7 0 0 0 14 0M12 17.5V21M8.5 21h7" />
  </svg>
);

const MicOffIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m3 3 18 18" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.3 9.28V6a2.7 2.7 0 1 1 5.4 0v6a2.48 2.48 0 0 1-.08.62" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.2 7.2a6.92 6.92 0 0 0 4.8 11.96 7 7 0 0 0 5.1-2.18M5 10.5a7 7 0 0 0 2.28 5.14M12 17.5V21M8.5 21h7" />
  </svg>
);

const CloseIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6 18 18M18 6 6 18" />
  </svg>
);

const PhoneOffIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 15.8v2.2a2 2 0 0 1-2.18 2 19.3 19.3 0 0 1-8.4-2.95 18.9 18.9 0 0 1-5.82-5.82A19.3 19.3 0 0 1 1.64 2.8 2 2 0 0 1 3.63.62h2.2a2 2 0 0 1 1.97 1.64l.46 2.75a2 2 0 0 1-.57 1.74L6.1 8.35a15.8 15.8 0 0 0 9.55 9.55l1.6-1.6a2 2 0 0 1 1.74-.57l2.75.46A2 2 0 0 1 21 15.8Z"
    />
  </svg>
);

const AudioWaveIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className}>
    <path strokeLinecap="round" d="M4 13.5v-3M8 16v-8M12 19V5M16 16v-8M20 13.5v-3" />
  </svg>
);

export default function CallCenter({ currentUser }: CallCenterProps) {
  const socketRef = useRef<Socket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const incomingCallAudioRef = useRef<HTMLAudioElement | null>(null);
  const outgoingCallAudioRef = useRef<HTMLAudioElement | null>(null);
  const callAudioUnlockedRef = useRef(false);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const currentCallRef = useRef<CallSession | null>(null);
  const incomingCallRef = useRef<CallSession | null>(null);
  const connectRetryRef = useRef(false);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const [currentCall, setCurrentCall] = useState<CallSession | null>(null);
  const [incomingCall, setIncomingCall] = useState<CallSession | null>(null);
  const [callState, setCallState] = useState<
    "idle" | "outgoing" | "incoming" | "connecting" | "active"
  >("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [callError, setCallError] = useState("");
  const [connectionLabel, setConnectionLabel] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    currentCallRef.current = currentCall;
  }, [currentCall]);

  useEffect(() => {
    incomingCallRef.current = incomingCall;
  }, [incomingCall]);

  useEffect(() => {
    setMediaElementStream(localVideoRef.current, localStream);
  }, [localStream]);

  useEffect(() => {
    setMediaElementStream(remoteVideoRef.current, remoteStream);
  }, [remoteStream]);

  useEffect(() => {
    setMediaElementStream(remoteAudioRef.current, remoteStream);
  }, [remoteStream]);

  useEffect(() => {
    if (!statusMessage) {
      return;
    }

    toast.info(statusMessage, {
      toastId: "call-status-toast",
    });
    setStatusMessage("");
  }, [statusMessage]);

  useEffect(() => {
    const incomingCallAudio = new Audio("/sounds/incoming-call.mp3");
    incomingCallAudio.preload = "auto";
    incomingCallAudio.loop = true;

    const outgoingCallAudio = new Audio("/sounds/outgoing-call.mp3");
    outgoingCallAudio.preload = "auto";
    outgoingCallAudio.loop = true;

    incomingCallAudioRef.current = incomingCallAudio;
    outgoingCallAudioRef.current = outgoingCallAudio;

    const unlockCallAudio = async () => {
      if (callAudioUnlockedRef.current) {
        return;
      }

      try {
        incomingCallAudio.muted = true;
        incomingCallAudio.volume = 0;
        await incomingCallAudio.play();
        incomingCallAudio.pause();
        incomingCallAudio.currentTime = 0;
        incomingCallAudio.muted = false;
        incomingCallAudio.volume = 1;

        outgoingCallAudio.muted = true;
        outgoingCallAudio.volume = 0;
        await outgoingCallAudio.play();
        outgoingCallAudio.pause();
        outgoingCallAudio.currentTime = 0;
        outgoingCallAudio.muted = false;
        outgoingCallAudio.volume = 1;

        callAudioUnlockedRef.current = true;
      } catch {
        incomingCallAudio.muted = false;
        incomingCallAudio.volume = 1;
        outgoingCallAudio.muted = false;
        outgoingCallAudio.volume = 1;
      }
    };

    const handleUserInteraction = () => {
      void unlockCallAudio();
    };

    window.addEventListener("pointerdown", handleUserInteraction, { passive: true });
    window.addEventListener("keydown", handleUserInteraction);
    window.addEventListener("touchstart", handleUserInteraction, { passive: true });

    return () => {
      window.removeEventListener("pointerdown", handleUserInteraction);
      window.removeEventListener("keydown", handleUserInteraction);
      window.removeEventListener("touchstart", handleUserInteraction);
      incomingCallAudio.pause();
      incomingCallAudio.currentTime = 0;
      outgoingCallAudio.pause();
      outgoingCallAudio.currentTime = 0;
      incomingCallAudioRef.current = null;
      outgoingCallAudioRef.current = null;
      callAudioUnlockedRef.current = false;
    };
  }, []);

  const stopCallSounds = useCallback(() => {
    const incomingCallAudio = incomingCallAudioRef.current;
    const outgoingCallAudio = outgoingCallAudioRef.current;

    if (incomingCallAudio) {
      incomingCallAudio.pause();
      incomingCallAudio.currentTime = 0;
    }

    if (outgoingCallAudio) {
      outgoingCallAudio.pause();
      outgoingCallAudio.currentTime = 0;
    }
  }, []);

  const playCallSound = useCallback(
    (type: "incoming" | "outgoing") => {
      const nextAudio =
        type === "incoming" ? incomingCallAudioRef.current : outgoingCallAudioRef.current;
      const otherAudio =
        type === "incoming" ? outgoingCallAudioRef.current : incomingCallAudioRef.current;

      if (otherAudio) {
        otherAudio.pause();
        otherAudio.currentTime = 0;
      }

      if (!nextAudio) {
        return;
      }

      nextAudio.currentTime = 0;
      void nextAudio.play().catch(() => {
        return;
      });
    },
    []
  );

  const stopStream = useCallback((stream: MediaStream | null) => {
    stream?.getTracks().forEach((track) => track.stop());
  }, []);

  const resetPeerState = useCallback(() => {
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    stopStream(localStreamRef.current);
    stopStream(remoteStreamRef.current);
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    pendingOfferRef.current = null;
    pendingIceCandidatesRef.current = [];
    setLocalStream(null);
    setRemoteStream(null);
    setConnectionLabel("");
  }, [stopStream]);

  const clearCallUi = useCallback((message = "", errorMessage = "") => {
    stopCallSounds();
    resetPeerState();
    setCurrentCall(null);
    setIncomingCall(null);
    setCallState("idle");
    setStatusMessage(message);
    setCallError(errorMessage);
    setIsBusy(false);
    setIsMuted(false);
  }, [resetPeerState, stopCallSounds]);

  const fetchSocketToken = useCallback(async () => {
    const response = await fetch("/api/realtime/socket-auth", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
    });
    const payload = (await response.json()) as {
      success: boolean;
      token?: string;
      message?: string;
    };

    if (!response.ok || !payload.success || !payload.token) {
      throw new Error(payload.message || "Unable to prepare realtime access right now.");
    }

    return payload.token;
  }, []);

  const emitSignal = useCallback(
    async (signalType: CallSignalType, payload: unknown, callId?: string) => {
      const activeSocket = socketRef.current;
      const activeCallId = callId ?? currentCallRef.current?._id ?? incomingCallRef.current?._id;

      if (!activeSocket || !activeSocket.connected || !activeCallId) {
        throw new Error("Realtime signaling is not ready right now.");
      }

      await new Promise<void>((resolve, reject) => {
        activeSocket.emit(
          "call:signal",
          {
            callId: activeCallId,
            signalType,
            payload,
          },
          (acknowledge: { success?: boolean; message?: string }) => {
            if (acknowledge?.success) {
              resolve();
              return;
            }

            reject(
              new Error(acknowledge?.message || "Unable to relay the call signal right now.")
            );
          }
        );
      });
    },
    []
  );

  const flushPendingIceCandidates = useCallback(async () => {
    const peerConnection = peerConnectionRef.current;
    if (!peerConnection || !peerConnection.remoteDescription) {
      return;
    }

    const queuedCandidates = [...pendingIceCandidatesRef.current];
    pendingIceCandidatesRef.current = [];

    for (const candidate of queuedCandidates) {
      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        continue;
      }
    }
  }, []);

  const attachPeerConnection = useCallback(
    (call: CallSession, stream: MediaStream) => {
      const peerConnection = new RTCPeerConnection({
        iceServers: ICE_SERVERS,
      });

      const nextRemoteStream = new MediaStream();
      remoteStreamRef.current = nextRemoteStream;
      setRemoteStream(nextRemoteStream);

      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });

      peerConnection.ontrack = (event) => {
        event.streams[0]?.getTracks().forEach((track) => {
          if (!nextRemoteStream.getTracks().some((existingTrack) => existingTrack.id === track.id)) {
            nextRemoteStream.addTrack(track);
          }
        });
        setRemoteStream(new MediaStream(nextRemoteStream.getTracks()));
      };

      peerConnection.onicecandidate = (event) => {
        if (!event.candidate) {
          return;
        }

        void emitSignal("ice-candidate", event.candidate.toJSON(), call._id).catch((error) => {
          setCallError(
            error instanceof Error
              ? error.message
              : "Unable to continue the call connection."
          );
        });
      };

      peerConnection.onconnectionstatechange = () => {
        const state = peerConnection.connectionState;
        if (state === "connected") {
          setCallState("active");
          setConnectionLabel("Connected");
          setCallError("");
          return;
        }

        if (state === "connecting") {
          setConnectionLabel("Connecting...");
          return;
        }

        if (state === "disconnected") {
          setConnectionLabel("Reconnecting...");
          return;
        }

        if (state === "failed" || state === "closed") {
          clearCallUi("The call has ended.");
        }
      };

      peerConnectionRef.current = peerConnection;
      return peerConnection;
    },
    [clearCallUi, emitSignal]
  );

  const prepareLocalStream = useCallback(async (callType: CallType) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("This browser cannot access audio or video calls.");
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: callType === "video",
    });

    localStreamRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, []);

  const handleSignalEvent = useCallback(
    async (payload: CallSignalPayload) => {
      const isRelevantCall =
        currentCallRef.current?._id === payload.callId ||
        incomingCallRef.current?._id === payload.callId;

      if (!isRelevantCall) {
        return;
      }

      if (payload.signalType === "offer") {
        const offer = payload.payload as RTCSessionDescriptionInit;
        pendingOfferRef.current = offer;

        const peerConnection = peerConnectionRef.current;
        if (peerConnection && !peerConnection.remoteDescription) {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
          await flushPendingIceCandidates();
        }

        return;
      }

      if (payload.signalType === "answer") {
        const answer = payload.payload as RTCSessionDescriptionInit;
        const peerConnection = peerConnectionRef.current;

        if (!peerConnection) {
          return;
        }

        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        await flushPendingIceCandidates();
        setCallState("active");
        setConnectionLabel("Connected");
        return;
      }

      const candidate = payload.payload as RTCIceCandidateInit;
      const peerConnection = peerConnectionRef.current;

      if (!peerConnection || !peerConnection.remoteDescription) {
        pendingIceCandidatesRef.current.push(candidate);
        return;
      }

      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    },
    [flushPendingIceCandidates]
  );

  const syncActiveCall = useCallback(async () => {
    if (!currentUser) {
      return;
    }

    try {
      const response = await fetch("/api/calls/active", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        success: boolean;
        data?: CallSession | null;
        message?: string;
      };

      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Unable to load the active call right now.");
      }

      const syncedCall = payload.data ? normalizeCallSession(payload.data) : null;

      if (!syncedCall) {
        if (
          currentCallRef.current &&
          currentCallRef.current.status !== "ended" &&
          currentCallRef.current.status !== "declined" &&
          currentCallRef.current.status !== "missed" &&
          currentCallRef.current.status !== "cancelled"
        ) {
          clearCallUi("The call has ended.");
        }
        return;
      }

      const alreadyTrackingCall =
        currentCallRef.current?._id === syncedCall._id ||
        incomingCallRef.current?._id === syncedCall._id;

      if (alreadyTrackingCall) {
        return;
      }

      if (syncedCall.status === "ringing") {
        if (syncedCall.isCaller) {
          setCurrentCall(syncedCall);
          setIncomingCall(null);
          setCallState("outgoing");
          setConnectionLabel("Ringing...");
        } else {
          setIncomingCall(syncedCall);
          setCurrentCall(null);
          setCallState("incoming");
          setStatusMessage("");
          setCallError("");
        }
        return;
      }

      if (syncedCall.status === "active") {
        setCurrentCall(syncedCall);
        setIncomingCall(null);
        setCallState("connecting");
        setConnectionLabel("Rejoining active call...");
      }
    } catch (error) {
      if (!currentCallRef.current && !incomingCallRef.current) {
        setCallError(
          error instanceof Error
            ? error.message
            : "Unable to load the active call right now."
        );
      }
    }
  }, [clearCallUi, currentUser]);

  const ensureSocketConnected = useCallback(async () => {
    const token = await fetchSocketToken();

    if (socketRef.current) {
      socketRef.current.auth = { token };
      if (!socketRef.current.connected) {
        socketRef.current.connect();
      }

      return socketRef.current;
    }

    const socket = io(SOCKET_URL, {
      autoConnect: false,
      transports: ["websocket", "polling"],
      withCredentials: true,
      auth: { token },
    });

    socket.on("connect", () => {
      connectRetryRef.current = false;
      setCallError("");
      void syncActiveCall();
    });

    socket.on("connect_error", async () => {
      if (connectRetryRef.current) {
        setCallError("Realtime calling is temporarily unavailable.");
        return;
      }

      connectRetryRef.current = true;

      try {
        const nextToken = await fetchSocketToken();
        socket.auth = { token: nextToken };
        socket.connect();
      } catch (error) {
        setCallError(
          error instanceof Error
            ? error.message
            : "Realtime calling is temporarily unavailable."
        );
      }
    });

    socket.on("call:incoming", (payload: IncomingSocketPayload) => {
      if (currentCallRef.current || incomingCallRef.current) {
        return;
      }

      setIncomingCall(normalizeCallSession(payload.call));
      setCallState("incoming");
      setStatusMessage("");
      setCallError("");
    });

    socket.on("call:outgoing", (payload: IncomingSocketPayload) => {
      if (payload.call._id !== currentCallRef.current?._id) {
        return;
      }

      setCurrentCall(normalizeCallSession(payload.call));
      setCallState("outgoing");
      setConnectionLabel("Ringing...");
    });

    socket.on("call:accepted", (payload: IncomingSocketPayload) => {
      if (payload.call._id !== currentCallRef.current?._id) {
        return;
      }

      setCurrentCall(normalizeCallSession(payload.call));
      setCallState("connecting");
      setConnectionLabel("Connecting...");
    });

    socket.on("call:declined", (payload: IncomingSocketPayload) => {
      if (
        payload.call._id !== currentCallRef.current?._id &&
        payload.call._id !== incomingCallRef.current?._id
      ) {
        return;
      }

      clearCallUi("The call was declined.");
    });

    socket.on("call:ended", (payload: IncomingSocketPayload) => {
      if (
        payload.call._id !== currentCallRef.current?._id &&
        payload.call._id !== incomingCallRef.current?._id
      ) {
        return;
      }

      clearCallUi("The call has ended.");
    });

    socket.on("call:signal", (payload: CallSignalPayload) => {
      void handleSignalEvent(payload).catch((error) => {
        setCallError(
          error instanceof Error ? error.message : "Unable to continue the call."
        );
      });
    });

    socketRef.current = socket;
    socket.connect();
    return socket;
  }, [clearCallUi, fetchSocketToken, handleSignalEvent, syncActiveCall]);

  const startOutgoingCall = useCallback(
    async (detail: StartCallEventDetail) => {
      if (!currentUser || currentCallRef.current || incomingCallRef.current || isBusy) {
        return;
      }

      setIsBusy(true);
      setStatusMessage("");
      setCallError("");

      try {
        await ensureSocketConnected();

        const response = await fetch("/api/calls/initiate", {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            calleeUserId: detail.callee.id,
            callType: detail.callType,
          }),
        });
        const payload = (await response.json()) as {
          success: boolean;
          data?: {
            call: CallSession;
          };
          message?: string;
        };

        if (!response.ok || !payload.success || !payload.data?.call) {
          throw new Error(payload.message || "Unable to start the call right now.");
        }

        const normalizedCall = normalizeCallSession(payload.data.call);
        setCurrentCall(normalizedCall);
        setCallState("outgoing");
        setConnectionLabel("Ringing...");

        const stream = await prepareLocalStream(detail.callType);
        const peerConnection = attachPeerConnection(normalizedCall, stream);
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        await emitSignal("offer", offer, normalizedCall._id);
      } catch (error) {
        clearCallUi(
          "",
          error instanceof Error ? error.message : "Unable to start the call right now."
        );
      } finally {
        setIsBusy(false);
      }
    },
    [
      attachPeerConnection,
      clearCallUi,
      currentUser,
      emitSignal,
      ensureSocketConnected,
      isBusy,
      prepareLocalStream,
    ]
  );

  const acceptIncomingCall = useCallback(async () => {
    const activeIncomingCall = incomingCallRef.current;

    if (!activeIncomingCall || isBusy) {
      return;
    }

    setIsBusy(true);
    setCallError("");

    try {
      await ensureSocketConnected();

      const response = await fetch(`/api/calls/${activeIncomingCall._id}/accept`, {
        method: "POST",
        credentials: "same-origin",
      });
      const payload = (await response.json()) as {
        success: boolean;
        data?: {
          call: CallSession;
        };
        message?: string;
      };

      if (!response.ok || !payload.success || !payload.data?.call) {
        throw new Error(payload.message || "Unable to accept the call right now.");
      }

      const normalizedCall = normalizeCallSession(payload.data.call);
      const stream = await prepareLocalStream(activeIncomingCall.callType);
      const peerConnection = attachPeerConnection(normalizedCall, stream);

      setIncomingCall(null);
      setCurrentCall(normalizedCall);
      setCallState("connecting");
      setConnectionLabel("Connecting...");

      if (pendingOfferRef.current) {
        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(pendingOfferRef.current)
        );
        await flushPendingIceCandidates();
      }

      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      await emitSignal("answer", answer, normalizedCall._id);
    } catch (error) {
      clearCallUi(
        "",
        error instanceof Error ? error.message : "Unable to accept the call right now."
      );
    } finally {
      setIsBusy(false);
    }
  }, [
    attachPeerConnection,
    clearCallUi,
    emitSignal,
    ensureSocketConnected,
    flushPendingIceCandidates,
    isBusy,
    prepareLocalStream,
  ]);

  const declineIncomingCall = useCallback(async () => {
    const activeIncomingCall = incomingCallRef.current;

    if (!activeIncomingCall || isBusy) {
      return;
    }

    setIsBusy(true);
    setCallError("");

    try {
      await fetch(`/api/calls/${activeIncomingCall._id}/decline`, {
        method: "POST",
        credentials: "same-origin",
      });
      clearCallUi("The call was declined.");
    } catch (error) {
      clearCallUi(
        "",
        error instanceof Error ? error.message : "Unable to decline the call right now."
      );
    }
  }, [clearCallUi, isBusy]);

  const endCurrentCall = useCallback(async () => {
    const activeCall = currentCallRef.current ?? incomingCallRef.current;

    if (!activeCall || isBusy) {
      return;
    }

    setIsBusy(true);
    setCallError("");

    try {
      await fetch(`/api/calls/${activeCall._id}/end`, {
        method: "POST",
        credentials: "same-origin",
      });
      clearCallUi("The call has ended.");
    } catch (error) {
      clearCallUi(
        "",
        error instanceof Error ? error.message : "Unable to end the call right now."
      );
    }
  }, [clearCallUi, isBusy]);

  const toggleMute = useCallback(() => {
    const activeLocalStream = localStreamRef.current;
    if (!activeLocalStream) {
      return;
    }

    const nextMutedState = !isMuted;
    activeLocalStream.getAudioTracks().forEach((track) => {
      track.enabled = !nextMutedState;
    });
    setIsMuted(nextMutedState);
  }, [isMuted]);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    void ensureSocketConnected().catch((error) => {
      setCallError(
        error instanceof Error ? error.message : "Realtime calling is unavailable."
      );
    });

    const handleStartCall = (event: WindowEventMap["sajha-call:start"]) => {
      void startOutgoingCall(event.detail);
    };

    void syncActiveCall();

    window.addEventListener("sajha-call:start", handleStartCall);

    return () => {
      window.removeEventListener("sajha-call:start", handleStartCall);
    };
  }, [currentUser, ensureSocketConnected, startOutgoingCall, syncActiveCall]);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== "visible") {
        return;
      }

      void syncActiveCall();
    }, ACTIVE_CALL_SYNC_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [currentUser, syncActiveCall]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      const activeCall = currentCallRef.current;
      if (!activeCall) {
        return;
      }

      void fetch(`/api/calls/${activeCall._id}/end`, {
        method: "POST",
        credentials: "same-origin",
        keepalive: true,
      });
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  useEffect(() => {
    return () => {
      stopCallSounds();
      socketRef.current?.disconnect();
      resetPeerState();
    };
  }, [resetPeerState, stopCallSounds]);

  useEffect(() => {
    if (callState === "incoming") {
      playCallSound("incoming");
      return;
    }

    if (callState === "outgoing") {
      playCallSound("outgoing");
      return;
    }

    stopCallSounds();
  }, [callState, playCallSound, stopCallSounds]);

  const activeCall = currentCall ?? incomingCall;
  const activeOtherUser = useMemo(() => {
    if (!activeCall || !isParticipantProfile(activeCall.otherUser)) {
      return null;
    }

    return activeCall.otherUser;
  }, [activeCall]);

  const isVideoCall = activeCall?.callType === "video";
  const showOverlay = Boolean(activeCall);

  if (!currentUser) {
    return null;
  }

  return (
    <>
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      {showOverlay ? (
        <div className="fixed inset-0 z-[80] bg-[radial-gradient(circle_at_top,#31406b_0%,#1b2340_35%,#0f172d_100%)]">
          {isVideoCall && remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : null}

          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,11,22,0.28)_0%,rgba(7,11,22,0.12)_32%,rgba(7,11,22,0.45)_100%)]" />

          <div className="relative flex h-full flex-col">
            <div className="flex items-start justify-between px-6 pb-4 pt-6 sm:px-8">
              <div className="space-y-3 text-white">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-white/90 backdrop-blur-xl">
                  {isVideoCall ? <VideoIcon className="h-4 w-4" /> : <PhoneIcon className="h-4 w-4" />}
                  {callState === "incoming"
                    ? "Incoming call"
                    : callState === "outgoing"
                      ? "Calling"
                      : "In call"}
                </div>
                <div>
                  <h2 className="text-[2rem] font-semibold tracking-[-0.05em] text-white sm:text-[2.3rem]">
                    {getDisplayName(activeOtherUser)}
                  </h2>
                  <p className="mt-2 text-sm text-white/72 sm:text-base">
                    {callState === "incoming"
                      ? `${activeCall?.callType === "video" ? "Video" : "Audio"} call request`
                      : connectionLabel || "Preparing secure connection..."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (callState === "incoming") {
                    void declineIncomingCall();
                    return;
                  }

                  void endCurrentCall();
                }}
                className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/14 text-white shadow-[0_18px_44px_rgba(0,0,0,0.25)] backdrop-blur-xl transition hover:bg-white/22"
                aria-label="Close call dialog"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            {callError ? (
              <div className="mx-6 rounded-2xl border border-[#ffb6a8]/35 bg-[#8d2e20]/35 px-4 py-3 text-sm text-white backdrop-blur-xl sm:mx-8">
                {callError}
              </div>
            ) : null}

            <div className="relative flex flex-1 items-center justify-center px-6 py-8 sm:px-8">
              {isVideoCall ? (
                <>
                  {!remoteStream ? (
                    <div className="flex h-full w-full items-center justify-center rounded-[28px] bg-black/22 text-center text-white/78 backdrop-blur-md">
                      Waiting for {activeOtherUser?.firstName ?? "the other person"}&apos;s video...
                    </div>
                  ) : null}

                  <div className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center text-white">
                    <div className="mb-4 flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border border-white/18 bg-[#131b31]/85 text-3xl font-semibold shadow-[0_24px_60px_rgba(0,0,0,0.28)] backdrop-blur-lg">
                      {activeOtherUser?.profileUrl ? (
                        <img
                          src={activeOtherUser.profileUrl}
                          alt={getDisplayName(activeOtherUser)}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        getInitials(activeOtherUser)
                      )}
                    </div>
                    <p className="text-2xl font-semibold tracking-[-0.04em]">
                      {getDisplayName(activeOtherUser)}
                    </p>
                    <p className="mt-2 text-sm text-white/72">
                      {connectionLabel || "Connecting..."}
                    </p>
                  </div>

                  <div className="absolute bottom-8 right-6 w-[160px] overflow-hidden rounded-[22px] border border-white/14 bg-[#11182d]/85 shadow-[0_22px_44px_rgba(0,0,0,0.3)] backdrop-blur-xl sm:right-8 sm:w-[210px]">
                    {localStream ? (
                      <video
                        ref={localVideoRef}
                        autoPlay
                        muted
                        playsInline
                        className="aspect-[4/5] h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex aspect-[4/5] items-center justify-center text-sm text-white/75">
                        Preparing your camera...
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex w-full max-w-xl flex-col items-center text-center text-white">
                  <div className="relative mb-8">
                    <div className="absolute inset-0 scale-[1.35] rounded-full bg-[#4560ff]/18 blur-3xl" />
                    <div className="relative flex h-36 w-36 items-center justify-center overflow-hidden rounded-full border border-white/12 bg-[#18223e]/90 text-[2.7rem] font-semibold shadow-[0_30px_70px_rgba(0,0,0,0.34)]">
                      {activeOtherUser?.profileUrl ? (
                        <img
                          src={activeOtherUser.profileUrl}
                          alt={getDisplayName(activeOtherUser)}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        getInitials(activeOtherUser)
                      )}
                    </div>
                  </div>
                  <h3 className="text-[2.2rem] font-semibold tracking-[-0.05em]">
                    {getDisplayName(activeOtherUser)}
                  </h3>
                  <p className="mt-3 text-base text-white/72">
                    {connectionLabel || "Preparing secure audio..."}
                  </p>
                  <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-white/82 backdrop-blur-xl">
                    {isMuted ? <MicOffIcon className="h-4 w-4 text-[#ff9c8e]" /> : <AudioWaveIcon className="h-4 w-4" />}
                    {isMuted ? "Microphone muted" : "Audio connected securely"}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-center px-6 pb-8 pt-4 sm:px-8">
              {callState === "incoming" ? (
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={() => void declineIncomingCall()}
                    disabled={isBusy}
                    className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-[#ed4956] text-white shadow-[0_22px_46px_rgba(237,73,86,0.34)] transition hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label="Decline call"
                  >
                    <PhoneOffIcon className="h-6 w-6 -rotate-[135deg]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void acceptIncomingCall()}
                    disabled={isBusy}
                    className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-[#31a24c] text-white shadow-[0_22px_46px_rgba(49,162,76,0.34)] transition hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label={`Accept ${activeCall?.callType === "video" ? "video" : "audio"} call`}
                  >
                    {activeCall?.callType === "video" ? <VideoIcon className="h-6 w-6" /> : <PhoneIcon className="h-6 w-6" />}
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={toggleMute}
                    disabled={isBusy || !localStream}
                    className={`inline-flex h-15 min-w-[64px] items-center justify-center rounded-full px-5 text-sm font-semibold shadow-[0_22px_46px_rgba(0,0,0,0.22)] backdrop-blur-xl transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 ${
                      isMuted
                        ? "bg-[#4a566f] text-white"
                        : "bg-white/16 text-white"
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      {isMuted ? <MicOffIcon className="h-5 w-5" /> : <MicIcon className="h-5 w-5" />}
                      <span className="hidden sm:inline">{isMuted ? "Unmute" : "Mute"}</span>
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => void endCurrentCall()}
                    disabled={isBusy}
                    className="inline-flex h-16 min-w-[148px] items-center justify-center gap-2 rounded-full bg-[#ed4956] px-6 text-sm font-semibold text-white shadow-[0_22px_46px_rgba(237,73,86,0.34)] transition hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <PhoneOffIcon className="h-5 w-5 -rotate-[135deg]" />
                    End call
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
