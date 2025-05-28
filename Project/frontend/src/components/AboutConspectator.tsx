import React from 'react'
import { Card, Typography, List, Image } from 'antd'

const { Title, Paragraph } = Typography

const teamData = [
  { icon: 'nextjs.png', title: 'NEXT.js', url: 'https://nextjs.org/docs', type: 'Frontend' },
  { icon: 'react.png', title: 'React', url: 'https://react.dev/learn', type: 'Frontend' },
  { icon: 'adonisjs.png', title: 'Adonis', url: 'https://docs.adonisjs.com/guides/preface/introduction', type: 'Backend' },
  { icon: 'ant-design.png', title: 'Ant Design', url: 'https://ant.design/components/overview/', type: 'CSS' },
  { icon: 'giga-chat.png', title: 'GigaChat API', url: 'https://developers.sber.ru/docs/ru/gigachat/api/overview', type: 'LLM модель' },
]

const AboutConspectator: React.FC = () => {
  return (
    <Card className="conspectator-card" style={{ textAlign: 'left' }}>
      <Title level={2}>Конспектатор</Title>
      <Paragraph>
        Создан криворуким гением-самоучкой, поэтому может не соответствовать вашим ожиданиям,
        но по идее должен на основании ваших непременно правильных лекций составить конспект.
        Но это не точно.
      </Paragraph>
      <List
        dataSource={teamData}
        style={{ textAlign: 'left' }}
        renderItem={(item) => (
          <List.Item style={{ display: 'flex', alignItems: 'center', padding: '8px 0' }}>
            <Image
              height={20}
              width={20}
              preview={false}
              style={{ marginRight: '8px', flexShrink: 0 }}
              src={`${item.icon}`}
              className="conspectator-icon"
            />
            <a href={item.url} target="_blank" rel="noopener noreferrer">
              {item.title}
            </a>
          </List.Item>
        )}
      />
    </Card>
  )
}

export default AboutConspectator