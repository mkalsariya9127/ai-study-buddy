import { useContext, useEffect } from "react";
import SocketContext from "./socketContextValue";

export function useDashboardSocket(onDashboardChanged) {
  const socket = useContext(SocketContext);

  useEffect(() => {
    if (!socket || typeof onDashboardChanged !== "function") return undefined;
    socket.on("dashboard:changed", onDashboardChanged);
    socket.on("connect", onDashboardChanged);
    return () => {
      socket.off("dashboard:changed", onDashboardChanged);
      socket.off("connect", onDashboardChanged);
    };
  }, [socket, onDashboardChanged]);
}
