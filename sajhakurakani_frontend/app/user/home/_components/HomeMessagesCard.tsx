// import Link from "next/link";
// import type { MessageConversationSummary } from "@/lib/api/messages";

// type HomeMessagesCardProps = {
//   conversations: MessageConversationSummary[];
//   currentUserId?: string;
// };

// export default function HomeMessagesCard({
//   conversations,
//   currentUserId,
// }: HomeMessagesCardProps) {
//   return (
//     <section className="rounded-[18px] border border-[#edd8cb] bg-white/84 p-4 shadow-[0_14px_32px_rgba(128,84,53,0.06)]">
//       <div className="flex items-center justify-between gap-3">
//         <div>
//           {/* <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#38a89d]">
//             Messages
//           </p> */}
//           <h2 className="mt-1.5 text-[1.6rem] font-semibold tracking-[-0.04em] text-[#1d243f]">
//             Messages
//           </h2>
//           {/* <h2 className="mt-1.5 text-[1.6rem] font-semibold tracking-[-0.04em] text-[#1d243f]">
//             Keep in touch
//           </h2> */}
//         </div>
//         <Link
//           href="/user/message"
//           className="rounded-full border border-[#edd8cb] bg-[#fff8f3] px-3 py-1 text-[0.85rem] font-semibold text-[#526077] transition hover:bg-white"
//         >
//           Open
//         </Link>
//       </div>

//       <div className="mt-4 space-y-2.5">
//         {conversations.length === 0 ? (
//           <div className="rounded-[14px] border border-[#e9ecef] bg-[#fbfcfd] px-3 py-4 text-[0.82rem] leading-6 text-[#6b7080]">
//             No conversations yet. Open your friends list to start a chat.
//           </div>
//         ) : (
//           conversations.map((conversation) => (
//             <Link
//               key={conversation.pairKey}
//               href={`/user/message?friend=${encodeURIComponent(conversation.otherUser.id)}`}
//               className="block rounded-[14px] border border-[#e9ecef] bg-[#fbfcfd] px-3 py-3 transition hover:bg-white"
//             >
//               <div className="flex items-center gap-2.5">
//                 <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1d243f] text-xs font-semibold text-white">
//                   {`${conversation.otherUser.firstName[0] ?? ""}${conversation.otherUser.lastName[0] ?? ""}`.toUpperCase() ||
//                     conversation.otherUser.username.slice(0, 2).toUpperCase()}
//                 </span>
//                 <div className="min-w-0">
//                   <p className="truncate text-[0.92rem] font-semibold text-[#1d243f]">
//                     {conversation.otherUser.firstName} {conversation.otherUser.lastName}
//                   </p>
//                   <p className="truncate text-[0.72rem] text-[#7b7580]">
//                     @{conversation.otherUser.username}
//                   </p>
//                 </div>
//               </div>
//               <p className="mt-2.5 line-clamp-2 text-[0.76rem] leading-5 text-[#6b7080]">
//                 {conversation.latestMessage.sender === currentUserId ? "You: " : ""}
//                 {conversation.latestMessage.content}
//               </p>
//             </Link>
//           ))
//         )}
//       </div>
//     </section>
//   );
// }


import Link from "next/link";
import type { MessageConversationSummary } from "@/lib/api/messages";

type HomeMessagesCardProps = {
  conversations: MessageConversationSummary[];
  currentUserId?: string;
};

export default function HomeMessagesCard({
  conversations,
  currentUserId,
}: HomeMessagesCardProps) {
  return (
    <section className="w-full rounded-2xl border border-[#edd8cb] bg-gradient-to-br from-white via-white to-[#fdf9f7] shadow-lg overflow-hidden">
      {/* Header with Gradient Background */}
      <div className="relative bg-gradient-to-r from-[#f5f3f1] to-[#faf8f6] px-4 py-4 border-b border-[#e8dcd2]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#1d243f]">Messages</h2>
            <p className="text-xs text-[#a89fa6] mt-0.5">
              {conversations.length} {conversations.length === 1 ? "conversation" : "conversations"}
            </p>
          </div>
          <Link
            href="/user/message"
            className="rounded-xl bg-[linear-gradient(135deg,#f68155_0%,#ef744b_100%)] px-4 py-2 text-sm font-semibold text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 active:scale-95"
          >
            Open
          </Link>
        </div>
      </div>

      {/* Conversations List */}
      <div className="max-h-96 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#f5f3f1] mb-2">
              <span className="text-xl">💬</span>
            </div>
            <p className="text-sm font-medium text-[#1d243f]">No messages yet</p>
            <p className="text-xs text-[#a89fa6] mt-1">Start a conversation today!</p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {conversations.map((conversation, index) => (
              <Link
                key={conversation.pairKey}
                href={`/user/message?friend=${encodeURIComponent(conversation.otherUser.id)}`}
                className="group block rounded-xl px-3 py-3 transition-all duration-200 border border-[#e8dcd2] hover:border-[#f68155] hover:bg-white/80"
              >
                <div className="flex items-start gap-3">
                  {/* Avatar with Status Indicator */}
                  <div className="relative">
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#2a3a52] to-[#1d243f] text-sm font-bold text-white shadow-md">
                      {conversation.otherUser.profileUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={conversation.otherUser.profileUrl}
                          alt={`${conversation.otherUser.firstName} ${conversation.otherUser.lastName}`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        `${conversation.otherUser.firstName[0] ?? ""}${conversation.otherUser.lastName[0] ?? ""}`.toUpperCase() ||
                        conversation.otherUser.username.slice(0, 2).toUpperCase()
                      )}
                    </span>
                    <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-[#38a89d] border-2 border-white shadow-sm"></div>
                  </div>

                  {/* Message Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#1d243f] group-hover:text-[#f68155] transition-colors">
                          {conversation.otherUser.firstName} {conversation.otherUser.lastName}
                        </p>
                        <p className="truncate text-xs text-[#a89fa6]">
                          @{conversation.otherUser.username}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-[#f5f3f1] text-[#7b7580]">
                          {conversation.latestMessage.sender === currentUserId ? "You" : "New"}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-1">
                      {conversation.latestMessage.sender === currentUserId && (
                        <span className="text-xs text-[#8b8590]">You:</span>
                      )}
                      <p className="line-clamp-1 text-xs text-[#7b7580] group-hover:text-[#6b7080] transition-colors">
                        {conversation.latestMessage.content}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
