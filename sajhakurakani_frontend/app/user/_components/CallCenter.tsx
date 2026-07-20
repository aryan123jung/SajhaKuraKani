"use client";

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
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

const isParticipantProfile = (
  user?: CallSession["otherUser"] | CallSession["caller"] | CallSession["callee"] | null
): user is CallParticipantProfile =>
  Boolean(user && "firstName" in user && "lastName" in user && "username" in user);

const setVideoElementStream = (
  element: HTMLVideoElement | null,
  stream: MediaStream | null
) => {
  if (!element) {
    return;
  }

  if (element.srcObject !== stream) {
    element.srcObject = stream;
  }
};

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

  useEffect(() => {
    currentCallRef.current = currentCall;
  }, [currentCall]);

  useEffect(() => {
    incomingCallRef.current = incomingCall;
  }, [incomingCall]);

  useEffect(() => {
    setVideoElementStream(localVideoRef.current, localStream);
  }, [localStream]);

  useEffect(() => {
    setVideoElementStream(remoteVideoRef.current, remoteStream);
  }, [remoteStream]);

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

      setIncomingCall(payload.call);
      setCallState("incoming");
      setStatusMessage("");
      setCallError("");
    });

    socket.on("call:outgoing", (payload: IncomingSocketPayload) => {
      if (payload.call._id !== currentCallRef.current?._id) {
        return;
      }

      setCurrentCall(payload.call);
      setCallState("outgoing");
      setConnectionLabel("Ringing...");
    });

    socket.on("call:accepted", (payload: IncomingSocketPayload) => {
      if (payload.call._id !== currentCallRef.current?._id) {
        return;
      }

      setCurrentCall(payload.call);
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
  }, [clearCallUi, fetchSocketToken, handleSignalEvent]);

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

        setCurrentCall(payload.data.call);
        setCallState("outgoing");
        setConnectionLabel("Ringing...");

        const stream = await prepareLocalStream(detail.callType);
        const peerConnection = attachPeerConnection(payload.data.call, stream);
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        await emitSignal("offer", offer, payload.data.call._id);
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

      const stream = await prepareLocalStream(activeIncomingCall.callType);
      const peerConnection = attachPeerConnection(payload.data.call, stream);

      setIncomingCall(null);
      setCurrentCall(payload.data.call);
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
      await emitSignal("answer", answer, payload.data.call._id);
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

    window.addEventListener("sajha-call:start", handleStartCall);

    return () => {
      window.removeEventListener("sajha-call:start", handleStartCall);
    };
  }, [currentUser, ensureSocketConnected, startOutgoingCall]);

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
      {statusMessage && !showOverlay ? (
        <div className="fixed bottom-5 right-5 z-[70] max-w-sm rounded-[16px] border border-[#edd8cb] bg-white/96 px-4 py-3 text-sm text-[#546178] shadow-[0_18px_40px_rgba(70,40,20,0.14)]">
          {statusMessage}
        </div>
      ) : null}

      {showOverlay ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#1d243f]/28 px-4 py-6 backdrop-blur-md">
          <div className="w-full max-w-4xl overflow-hidden rounded-[28px] border border-[#ead6c8] bg-white shadow-[0_30px_80px_rgba(40,24,15,0.22)]">
            <div className="flex items-start justify-between gap-4 border-b border-[#efe2d8] px-6 py-5">
              <div>
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[#ef744b]">
                  {callState === "incoming"
                    ? "Incoming call"
                    : callState === "outgoing"
                      ? "Calling"
                      : "In call"}
                </p>
                <h2 className="mt-2 text-[1.8rem] font-semibold tracking-[-0.05em] text-[#1d243f]">
                  {getDisplayName(activeOtherUser)}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#6b7080]">
                  {callState === "incoming"
                    ? `${activeCall?.callType === "video" ? "Video" : "Audio"} call request`
                    : connectionLabel || "Preparing secure connection..."}
                </p>
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
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#ecd7ca] bg-white text-[#6d5b55] shadow-[0_12px_24px_rgba(64,37,24,0.08)] transition hover:bg-[#fff7f1]"
                aria-label="Close call dialog"
              >
                x
              </button>
            </div>

            <div className="px-6 py-6">
              {callError ? (
                <div className="mb-4 rounded-[16px] border border-[#f2c5bb] bg-[#fff1ec] px-4 py-3 text-sm text-[#b14f3f]">
                  {callError}
                </div>
              ) : null}

              {isVideoCall ? (
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
                  <div className="overflow-hidden rounded-[22px] border border-[#edd8cb] bg-[#11182d]">
                    {remoteStream ? (
                      <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className="aspect-video h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex aspect-video items-center justify-center text-sm text-white/75">
                        Waiting for {activeOtherUser?.firstName ?? "the other person"}&apos;s video...
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="overflow-hidden rounded-[22px] border border-[#edd8cb] bg-[#1d243f]">
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

                    <div className="rounded-[20px] border border-[#efe2d8] bg-[#fff8f3] px-4 py-4 text-sm text-[#667086]">
                      Browser media is encrypted with WebRTC during the call.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-[24px] border border-[#efe2d8] bg-[linear-gradient(180deg,#fffaf6_0%,#fff6ef_100%)] px-6 py-8">
                  <div className="flex flex-col items-center text-center">
                    <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-[#1d243f] text-2xl font-semibold text-white shadow-[0_18px_34px_rgba(29,36,63,0.16)]">
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
                    <p className="mt-5 text-[1.4rem] font-semibold tracking-[-0.04em] text-[#1d243f]">
                      {getDisplayName(activeOtherUser)}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[#667086]">
                      {connectionLabel || "Preparing secure audio..."}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[#efe2d8] px-6 py-5">
              {callState === "incoming" ? (
                <>
                  <button
                    type="button"
                    onClick={() => void declineIncomingCall()}
                    disabled={isBusy}
                    className="rounded-full border border-[#e5c7ba] bg-white px-5 py-3 text-sm font-semibold text-[#6c5f5c] transition hover:bg-[#fff8f3] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Decline
                  </button>
                  <button
                    type="button"
                    onClick={() => void acceptIncomingCall()}
                    disabled={isBusy}
                    className="rounded-full bg-[linear-gradient(135deg,#f68155_0%,#ef744b_100%)] px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(241,111,56,0.18)] transition disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Accept {activeCall?.callType === "video" ? "video" : "audio"} call
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => void endCurrentCall()}
                  disabled={isBusy}
                  className="rounded-full bg-[#1d243f] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#2b3357] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  End call
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
