import React from 'react';
import { Button, Image } from 'antd';
import { HistoryOutlined, EditOutlined } from '@ant-design/icons';
import { useRouter, usePathname } from 'next/navigation';

interface PageHeaderProps {
  onHistoryClick: () => void;
  showNewChatButton?: boolean;
  onNewChatClick?: () => void;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  onHistoryClick,
  showNewChatButton = false,
  onNewChatClick,
}) => {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogoClick = () => {
    router.push('/');
  };

  const isHomePage = pathname === '/';

  return (
    <div style={{
      position: 'sticky',
      top: 0,
      zIndex: 1001,
      background: '#fff',
    }}>
      <div style={{
        padding: '8px 0',
        flexShrink: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <div style={{
          width: '90%',
          maxWidth: '800px',
          display: 'flex',
          justifyContent: isHomePage ? 'flex-end' : 'space-between',
          alignItems: 'center',
        }}>
          {/* Логотип слева (не показываем на главной странице) */}
          {!isHomePage && (
            <div onClick={handleLogoClick} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <Image
                src="/logo.png"
                alt="Logo"
                width={32}
                height={32}
                preview={false}
              />
            </div>
          )}

          {/* Кнопки справа */}
          <div style={{ display: 'flex', alignItems: 'center' }}> {/* Обертка для кнопок, чтобы они были вместе */}
            <Button
              icon={<HistoryOutlined />}
              onClick={onHistoryClick}
              style={{ marginRight: showNewChatButton && !isHomePage ? '10px' : (showNewChatButton && isHomePage ? '10px' : '0') }}
            />
            {showNewChatButton && onNewChatClick && (
              <Button
                icon={<EditOutlined />}
                onClick={onNewChatClick}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageHeader;