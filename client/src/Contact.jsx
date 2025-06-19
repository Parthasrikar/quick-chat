/* eslint-disable react/prop-types */
import Avatar from "./Avatar";

export default function Contact({ id, username, onClick, selected, online }) {
  return (
    <div
      onClick={onClick}
      className={`py-3 sm:py-4 px-3 sm:px-4 text-sm sm:text-base border-b border-indigo-300 flex items-center gap-2 sm:gap-3 cursor-pointer transition-colors duration-200 hover:bg-indigo-200/50 ${
        selected ? "bg-indigo-200" : "bg-indigo-100"
      }`}
    >
      {selected && <div className="w-1 h-12 bg-indigo-700 rounded-r-md absolute left-0" />}
      <Avatar username={username} id={id} online={online} />
      <div className="flex-1 min-w-0">
        <span className="text-black/85 font-medium truncate block">{username}</span>
        <span className={`text-xs ${online ? 'text-green-600' : 'text-gray-500'}`}>
          {online ? 'Online' : 'Offline'}
        </span>
      </div>
    </div>
  );
}