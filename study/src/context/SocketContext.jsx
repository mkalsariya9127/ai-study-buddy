import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { API_ORIGIN } from "../services/api";
import SocketContext from "./socketContextValue";

export function SocketProvider({ children }) {
  const [socket] = useState(() =>
    io(API_ORIGIN, {
      autoConnect: false,
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
    })
  );

  useEffect(() => {
    socket.connect();
    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [socket]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
}
