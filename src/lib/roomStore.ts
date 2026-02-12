import { useState, useCallback } from "react";

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
}

export interface Room {
  id: number;
  users: string[];
  messages: ChatMessage[];
}

// In-memory rooms — zero persistence
const rooms: Room[] = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1,
  users: [],
  messages: [],
}));

export function getRooms(): Room[] {
  return rooms;
}

export function getRoom(id: number): Room | undefined {
  return rooms.find((r) => r.id === id);
}

export function joinRoom(roomId: number, username: string): boolean {
  const room = getRoom(roomId);
  if (!room) return false;
  if (room.users.length >= 2) return false;
  if (room.users.includes(username)) return true; // already in
  room.users.push(username);
  return true;
}

export function leaveRoom(roomId: number, username: string) {
  const room = getRoom(roomId);
  if (!room) return;
  room.users = room.users.filter((u) => u !== username);
  // If room is empty, clear messages (zero persistence)
  if (room.users.length === 0) {
    room.messages = [];
  }
}

export function addMessage(roomId: number, sender: string, text: string): ChatMessage | null {
  const room = getRoom(roomId);
  if (!room) return null;
  const msg: ChatMessage = {
    id: crypto.randomUUID(),
    sender,
    text,
    timestamp: Date.now(),
  };
  room.messages.push(msg);
  return msg;
}

// Hook for reactive room state
export function useRoomState() {
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);
  return { rooms: getRooms(), refresh, tick };
}
