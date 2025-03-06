/* eslint-disable no-unused-vars */
import { useContext, useEffect, useRef, useState } from "react";
import { IoSend } from "react-icons/io5";
import { TfiJoomla } from "react-icons/tfi";
import Avatar from "./Avatar";
import { UserContext } from "./User";
import {uniqBy} from "lodash";
import axios from 'axios';


export default function Chat() {
  const [ws, setWs] = useState(null);
  const [people, setPeople] = useState({});
  const [selectedUser, setSelectedUser] = useState(null);
  const [newMessageText, setNewMessageText] = useState("");
  const [messages, setMessages] = useState([]);
  const { username, id } = useContext(UserContext);
  const divUnderMessages = useRef();
  useEffect(() => {
    const ws = new WebSocket("ws://localhost:3000");
    setWs(ws);
    ws.addEventListener("message", handleMessage);
  }, []);

  function showPeopleOnline(peopleArray) {
    const people = {};
    peopleArray.forEach(({ id, username }) => {
      people[id] = username;
    });
    const peopleExceptUser = { ...people };
    delete peopleExceptUser[id];
    setPeople(peopleExceptUser);
  }

  const handleMessage = (e) => {
    const message = JSON.parse(e.data);
    if ("online" in message) {
      showPeopleOnline(message.online);
    }
    else if('text' in message)  {
      setMessages((prevMessages) => [...prevMessages, {...message}]);
      
    }
  };

  function sendMessage(e) {
    e.preventDefault();
    console.log("sending");

    ws.send(
      JSON.stringify({
        recipient: selectedUser,
        text: newMessageText,
      })
    );
    setNewMessageText("");
    setMessages(prev => ([...prev,{
      text: newMessageText,
      sender: id,
      recipient: selectedUser,
      _id: Date.now(),
    }]));

  }

  useEffect(() => {
    const div = divUnderMessages.current;
    if(div) {
      div.scrollIntoView({behaviour: 'smooth', block:"end"});
    }
  },[messages])

  useEffect(()=> {
    if(selectedUser) {
      axios.get(`/messages/${selectedUser}`);
    }
  }, [selectedUser])

  const messagesWithoutDupes = uniqBy(messages, '_id');

  return (
    <div className="flex h-screen">
      <div className="w-1/3 bg-indigo-100">
        <div className="flex gap-2 items-center p-5 pl-4 text-3xl text-indigo-700 bg-indigo-300/80 transition-all cursor-pointer hover:text-indigo-900">
          <TfiJoomla className="" />
          <h2 className="">Quick-Chat</h2>
        </div>
        {Object.keys(people).map((id) => {
          return (
            <div
              onClick={() =>
                selectedUser == id ? setSelectedUser(null) : setSelectedUser(id)
              }
              key={id}
              className={
                "py-5 max-h-20 text-lg border-b border-indigo-300 flex items-center gap-2 cursor-pointer " +
                (selectedUser === id ? "bg-indigo-200" : "bg-indigo-100")
              }
            >
              {selectedUser && (
                <div className="w-2 h-18 bg-indigo-700 rounded-r-md"></div>
              )}
              <Avatar username={people[id]} id={id} />
              <span className="text-black/85">{people[id]}</span>
            </div>
          );
        })}
      </div>
      <div className="w-2/3 bg-indigo-200">
        <div className="flex flex-col h-screen p-5">
          <div className="grow h-full">
            {!selectedUser && (
              <div className="grow flex items-center justify-center h-full text-indigo-400/50 text-xl">
                &larr; Select a contact to message!!!
              </div>
            )}
            {
              selectedUser && (
                <div className="relative h-full">
                  <div className="overflow-y-scroll absolute top-0 left-0 right-0 bottom-2">
                  {messagesWithoutDupes.map((message) => (
                    <div key={message.id} className={(message.sender === id ? 'text-right': 'text-left')}>
                      <div className={"min-w-24 text-left inline-block p-2 rounded-md my-2 text-md "+(message.sender === id ? "bg-indigo-300" : "bg-indigo-100")}>{message.text}</div>
                    </div>
                    
                  ))}
                  <div ref={divUnderMessages}></div>
                </div>
                </div>
                
              )
            }
          </div>
          {selectedUser && (
            <form className="flex gap-2 p-2" onSubmit={sendMessage}>
              <input
                type="text"
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
                className="w-full bg-indigo-100 ml-3 p-2 rounded-sm"
                placeholder="type your message here"
              />
              <button
                type="submit"
                className="text-lg py-2 px-3 rounded-sm bg-indigo-400 flex items-center justify-center text-white"
              >
                <IoSend />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
