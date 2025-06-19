/* eslint-disable react/prop-types */
export default function Avatar({ id, username, online }) {
  const colors = [
    'bg-blue-200', 
    'bg-red-200', 
    'bg-yellow-200', 
    'bg-green-200', 
    'bg-teal-200', 
    'bg-purple-200',
    'bg-pink-200',
    'bg-orange-200'
  ];
  
  const num = parseInt(id, 16);
  const color = colors[num % colors.length];
  
  return (
    <div className={`flex items-center relative justify-center h-8 w-8 sm:h-10 sm:w-10 rounded-full text-black opacity-90 text-xs sm:text-sm font-medium ${color}`}>
      {username?.[0]?.toUpperCase() || '?'}
      {online !== undefined && (
        <div className={`absolute h-2 w-2 sm:h-3 sm:w-3 bottom-0 right-0 rounded-full border border-white ${
          online ? 'bg-green-400' : 'bg-gray-400'
        }`} />
      )}
    </div>
  );
}