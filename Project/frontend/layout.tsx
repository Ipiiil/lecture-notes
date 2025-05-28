import type { Metadata } from 'next';
import './globals.css';
import { ConfigProvider, App as AntdApp } from 'antd';
import { ReactNode } from 'react';
import StyledComponentsRegistry from '@/lib/AntdRegistry'; // Импортируем ваш AntdRegistry

export const metadata: Metadata = {
  title: 'Чат-бот',
  description: 'Чат-бот с архивными чатами',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <head>
        {/* Удаляем ручные ссылки на CSS, Next.js и AntdRegistry позаботятся об этом */}
      </head>
      <body>
        <StyledComponentsRegistry> {/* Оборачиваем в StyledComponentsRegistry */}
          <ConfigProvider
            theme={{
              token: {
                colorPrimary: '#1890ff',
              },
            }}
          >
            <AntdApp>{children}</AntdApp>
          </ConfigProvider>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}