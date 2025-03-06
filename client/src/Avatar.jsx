/* eslint-disable react/prop-types */
export default function Avatar({id, username}) {
    const colors = ['bg-blue-200', 'bg-red-200', 'bg-yellow-200', 'bg-green-200', 'bg-teal-200', 'bg-purple-200'];
    const num = parseInt(id, 16);
    const color = colors[num % colors.length];
    return (
        <div className={`ml-4 flex items-center justify-center h-10 w-10 rounded-full text-black opacity-90 text-sm ${color}`}>
            {username[0].toUpperCase()}
        </div>
    )
}