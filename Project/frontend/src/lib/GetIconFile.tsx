import { API_BASE_URL } from '@/types'
import { DownloadOutlined, FileImageOutlined, FilePdfOutlined, FileTextOutlined, FileUnknownOutlined, FileWordOutlined } from '@ant-design/icons'
import { JSX } from 'react'

// Хелпер для поиска иконок к файлу
const GetFileIcon = (fileName?: string, fileType?: string, size: number = 24): JSX.Element => {
  const style = { fontSize: `${size}px`, marginRight: '8px' }
  if (!fileName && !fileType) return <FileUnknownOutlined style={style} />
  const ext = fileName?.slice(fileName.lastIndexOf('.') + 1).toLowerCase() || ''
  const type = fileType?.toLowerCase() || ''

  if (type.startsWith('image/') || ['png', 'jpg', 'jpeg'].includes(ext)) return <FileImageOutlined style={style} />
  if (type === 'application/pdf' || ext === 'pdf') return <FilePdfOutlined style={style} />
  if (type.includes('word') || ['doc', 'docx'].includes(ext)) return <FileWordOutlined style={style} />
  if (type.startsWith('text/') || ['txt', 'md'].includes(ext)) return <FileTextOutlined style={style} />
  return <FileUnknownOutlined style={style} />
}

// Компонент, использующий GetFileIcon
const FileDisplay = ({
  fileName,
  fileType,
  fileSize,
  size = 24,
  url,
}: {
  fileName?: string
  fileType?: string
  fileSize?: number // Размер файла в байтах
  size?: number
  url?: string
}) => {
  const fullUrl = url ? (url.startsWith('http') ? url : `${API_BASE_URL}/files/${url}`) : undefined
  const nameStyle = { fontSize: url ? `${size}px` : undefined }

  // Форматируем размер файла (например, в КБ или МБ)
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {GetFileIcon(fileName, fileType, size)}
      <span style={nameStyle}>{fileName || 'Unknown File'}</span>
      {fileSize && (
        <span style={{ color: '#888', ...nameStyle }}>({formatFileSize(fileSize)})</span>
      )}
      {fullUrl && (
        <a href={fullUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center' }}>
          <DownloadOutlined style={{ fontSize: `${size}px` }} />
        </a>
      )}
    </div>
  )
}

export default FileDisplay