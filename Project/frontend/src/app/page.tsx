'use client';

import React, { useEffect, useState } from 'react';
import { Layout, Image, App } from 'antd';
import { usePathname, useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { ServerFileInfo, Chat, API_BASE_URL } from '../types';
import HistoryDrawer from '../components/HistoryDrawer';
import AboutConspectator from '@/components/AboutConspectator';
import PageHeader from '@/components/PageHeader';
import ChatFooter from '@/components/ChatFooter';

const { Content } = Layout;

export default function HomePage() {
  const { message: messageApi } = App.useApp();
  const router = useRouter();
  const pathname = usePathname();

  const [newChatUid, setNewChatUid] = useState(() => uuidv4());
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const handleOpenHistoryDrawer = () => setIsHistoryDrawerOpen(true);

  useEffect(() => {
    if (pathname === '/') {
      setNewChatUid(uuidv4());
    }
  }, [pathname]);

  const handleCreateChatAndSendMessage = async (content: string, attachments: ServerFileInfo[]) => {
    const trimmedContent = content.trim();
    if (!trimmedContent && attachments.length === 0) {
      messageApi.warning('Введите сообщение или прикрепите файлы, чтобы начать новый чат.');
      return;
    }

    setIsCreatingChat(true);
    const chatUidForNewChat = newChatUid;

    try {
      const chatTitle = trimmedContent.substring(0, 50) ||
        (attachments.length > 0 ? `Чат с вложениями от ${new Date().toLocaleTimeString()}` : `Новый чат от ${new Date().toLocaleTimeString()}`);

      const chatResponse = await fetch(`${API_BASE_URL}/chats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: chatUidForNewChat, title: chatTitle }),
      });

      if (!chatResponse.ok) {
        const errorData = await chatResponse.json().catch(() => ({ error: 'Не удалось создать новый чат' }));
        messageApi.error(errorData.error || 'Не удалось создать новый чат.');
        setIsCreatingChat(false);
        return;
      }

      const newChat: Chat = await chatResponse.json();

      const pendingMessage = {
        content: trimmedContent,
        attachments: attachments.map(a => ({
          uid: a.uid,
          name: a.name,
          type: a.type,
          size: a.size,
          url: a.url,
          status: a.status
        })),
      };
      sessionStorage.setItem(`pendingMessage_${newChat.uid}`, JSON.stringify(pendingMessage));

      messageApi.success(`Чат "${newChat.title}" создан. Перенаправление...`);

      router.push(`/chat/${newChat.uid}?firstMessage=true`);

    } catch (error: any) {
      messageApi.error(`Произошла ошибка: ${error.message || 'Неизвестная ошибка'}`);
      setIsCreatingChat(false);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        onHistoryClick={handleOpenHistoryDrawer}
      />

      <Content
        style={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}
      >
        <div style={{
          textAlign: 'center',
          marginBottom: 40,
          width: '90%',
          maxWidth: '800px',
        }}>
          <Image
            width={100}
            src="/logo.png"
            alt="Logo"
            preview={false}
            style={{ marginBottom: 16 }}
          />
          <AboutConspectator />
        </div>
      </Content>

      <ChatFooter
        onSend={handleCreateChatAndSendMessage}
        loading={isCreatingChat}
        chatUid={newChatUid}
        fileUploadUrl={`${API_BASE_URL}/files`}
        fileDeleteUrl={`${API_BASE_URL}/files`}
      />

      <HistoryDrawer
        open={isHistoryDrawerOpen}
        onClose={() => setIsHistoryDrawerOpen(false)}
        currentChatUid={null}
      />
    </Layout>
  );
}