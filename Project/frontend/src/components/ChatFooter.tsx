import React from 'react';
import { Layout } from 'antd';
import MessageInput from './MessageInput';
import { ServerFileInfo } from '../types';

const { Footer: AntFooter } = Layout;

interface ChatFooterProps {
  onSend: (content: string, attachments: ServerFileInfo[]) => Promise<void>;
  loading: boolean;
  fileUploadUrl: string;
  fileDeleteUrl: string;
  chatUid: string;
}

const ChatFooter: React.FC<ChatFooterProps> = ({
  onSend,
  loading,
  fileUploadUrl,
  fileDeleteUrl,
  chatUid,
}) => {
  return (
    <AntFooter
      style={{
        position: 'sticky',
        bottom: 0,
        zIndex: 1001,
        padding: '4px 12px',
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div style={{ width: '90%', maxWidth: '800px' }}>
        <MessageInput
          onSend={onSend}
          loading={loading}
          fileUploadUrl={fileUploadUrl}
          fileDeleteUrl={fileDeleteUrl}
          chatUid={chatUid}
        />
      </div>
    </AntFooter>
  );
};

export default ChatFooter;