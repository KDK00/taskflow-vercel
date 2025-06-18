import { db } from "./db";
import { sql } from "drizzle-orm";
import { WebSocket } from "ws";

interface ChatMessage {
  id: string;
  userId: number;
  username: string;
  message: string;
  timestamp: Date;
  type: 'message' | 'join' | 'leave';
}

interface ConnectedUser {
  userId: number;
  username: string;
  ws: WebSocket;
}

class ChatManager {
  private connectedUsers: Map<number, ConnectedUser> = new Map();
  private chatHistory: ChatMessage[] = [];

  addUser(userId: number, username: string, ws: WebSocket) {
    this.connectedUsers.set(userId, { userId, username, ws });
    
    // Broadcast join message
    const joinMessage: ChatMessage = {
      id: Date.now().toString(),
      userId,
      username,
      message: `${username}님이 채팅에 참여했습니다.`,
      timestamp: new Date(),
      type: 'join'
    };
    
    this.broadcastMessage(joinMessage);
    this.chatHistory.push(joinMessage);
    
    // Send chat history to new user
    ws.send(JSON.stringify({
      type: 'chat_history',
      data: this.chatHistory.slice(-50) // Last 50 messages
    }));
  }

  removeUser(userId: number) {
    const user = this.connectedUsers.get(userId);
    if (user) {
      this.connectedUsers.delete(userId);
      
      const leaveMessage: ChatMessage = {
        id: Date.now().toString(),
        userId,
        username: user.username,
        message: `${user.username}님이 채팅을 나갔습니다.`,
        timestamp: new Date(),
        type: 'leave'
      };
      
      this.broadcastMessage(leaveMessage);
      this.chatHistory.push(leaveMessage);
    }
  }

  sendMessage(userId: number, messageText: string) {
    const user = this.connectedUsers.get(userId);
    if (!user) return;

    const message: ChatMessage = {
      id: Date.now().toString(),
      userId,
      username: user.username,
      message: messageText,
      timestamp: new Date(),
      type: 'message'
    };

    this.broadcastMessage(message);
    this.chatHistory.push(message);
    
    // Keep only last 100 messages in memory
    if (this.chatHistory.length > 100) {
      this.chatHistory = this.chatHistory.slice(-100);
    }
  }

  private broadcastMessage(message: ChatMessage) {
    const messageData = JSON.stringify({
      type: 'chat_message',
      data: message
    });

    this.connectedUsers.forEach((user) => {
      if (user.ws.readyState === WebSocket.OPEN) {
        user.ws.send(messageData);
      }
    });
  }

  getConnectedUsers() {
    return Array.from(this.connectedUsers.values()).map(user => ({
      userId: user.userId,
      username: user.username
    }));
  }
}

export const chatManager = new ChatManager();