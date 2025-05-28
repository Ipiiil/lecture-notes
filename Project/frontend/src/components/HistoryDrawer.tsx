'use client';

import React, { useState, useEffect } from 'react';
import { Drawer, Input, Spin, Typography, List, Empty, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { API_BASE_URL, Chat } from '../types';

const { Text } = Typography;

interface HistoryDrawerProps {
  open: boolean;
  onClose: () => void;
  currentChatUid: string | null;
}

export default function HistoryDrawer({ open, onClose, currentChatUid }: HistoryDrawerProps) {
  const router = useRouter();
  const [chats, setChats] = useState<Chat[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingChats, setLoadingChats] = useState(false);

  const fetchChats = async () => {
    setLoadingChats(true);
    try {
      const response = await fetch(`${API_BASE_URL}/chats`);
      if (!response.ok) throw new Error('Не удалось загрузить чаты');
      const data: Chat[] = await response.json();
      setChats(
        data.sort((a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
        )
      );
    } catch (error: any) {
      message.error({ content: error.message || 'Ошибка загрузки истории чатов.' });
      setChats([]);
    } finally {
      setLoadingChats(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchChats();
    }
  }, [open]);

  const handleChatSelect = (chatUid: string) => {
    if (currentChatUid === chatUid) {
      onClose();
      return;
    }
    router.push(`/chat/${chatUid}`);
    onClose();
  };

  const filteredChats = chats.filter((chat) =>
    chat.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Drawer
      title="История чатов"
      placement="right"
      onClose={onClose}
      open={open}
      width={350}
      zIndex={1050}
      styles={{
        header: { borderBottom: '1px solid #f0f0f0' },
        body: { padding: 0, display: 'flex', flexDirection: 'column', height: '100%' },
      }}
    >
      <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0' }}> {/* Обертка для поиска */}
        <Input
          placeholder="Поиск по названию..."
          prefix={<SearchOutlined />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          allowClear
        />
      </div>

      {loadingChats ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Spin size="large" />
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredChats.length > 0 ? (
            <List
              itemLayout="horizontal"
              dataSource={filteredChats}
              renderItem={(chat) => (
                <List.Item
                  onClick={() => handleChatSelect(chat.uid)}
                  style={{
                    cursor: 'pointer',
                    backgroundColor: chat.uid === currentChatUid ? '#e6f7ff' : 'transparent',
                    padding: '12px 16px',
                  }}
                  className="chat-history-item"
                >
                  <List.Item.Meta
                    title={<Text ellipsis={{ tooltip: chat.title }}>{chat.title}</Text>}
                    description={
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {chat.updatedAt ? `Обновлен: ${new Date(chat.updatedAt).toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' })} ${new Date(chat.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Недавно'}
                      </Text>
                    }
                  />
                </List.Item>
              )}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <Empty description={searchTerm ? "Чаты не найдены" : "История чатов пуста"} />
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}