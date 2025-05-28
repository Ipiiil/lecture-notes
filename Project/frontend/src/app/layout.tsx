import type { Metadata } from 'next';
import './globals.css';
import { ConfigProvider, App as AntdApp } from 'antd';
import { ReactNode } from 'react';
import StyledComponentsRegistry from '@/lib/AntdRegistry';

export const metadata: Metadata = {
  title: 'Чат-бот',
  description: 'Чат-бот с архивными чатами',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <head>
      </head>
      <body>
        <StyledComponentsRegistry>
          <ConfigProvider
            theme={{
              token: {
                colorPrimary: '#abb0b3',
                colorBgLayout: '#fff',
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