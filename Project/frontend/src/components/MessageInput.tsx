'use client';

import '@ant-design/v5-patch-for-react-19';
import React, { useState } from 'react';
import { Input, Button, Upload, Typography, Spin, App } from 'antd';
import { SendOutlined, LoadingOutlined, DeleteOutlined, PaperClipOutlined } from '@ant-design/icons';
import { v4 as uuidv4 } from 'uuid';
import { ACCEPTED_FILE_TYPES, MAX_FILE_SIZE, MAX_FILES, MAX_MESSAGE_LENGTH, ServerFileInfo, StagedFile } from '@/types';
import { RcFile } from 'antd/es/upload';
import FileDisplay from '@/lib/GetIconFile';

const { TextArea } = Input;
const { Text } = Typography;

interface UnifiedInputFieldProps {
  onSend: (messageText: string, attachments: ServerFileInfo[]) => Promise<void>;
  loading: boolean;
  chatUid: string;
  fileUploadUrl: string;
  fileDeleteUrl: string;
}

export default function UnifiedInputField({
  onSend,
  loading,
  chatUid,
  fileUploadUrl,
  fileDeleteUrl,
}: UnifiedInputFieldProps) {
  const [messageInput, setMessageInput] = useState('');
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const { message } = App.useApp();
  const isAnyFileUploading = stagedFiles.some(sf => sf.uploading);
  const isSendDisabled = loading || isAnyFileUploading || messageInput.trim() === '';

  const handleFileUpload = async (file: File): Promise<ServerFileInfo | null> => {
    if (stagedFiles.some(sf => sf.file.name === file.name && sf.file.lastModified === file.lastModified && !sf.error && !sf.uploading)) {
      message.warning({ content: `Файл "${file.name}" уже добавлен и загружен.` });

      return stagedFiles.find(sf => sf.file.name === file.name && sf.file.lastModified === file.lastModified)?.serverFileInfo || null;
    }
    if (stagedFiles.some(sf => sf.file.name === file.name && sf.file.lastModified === file.lastModified && sf.uploading)) {
      message.warning({ content: `Файл "${file.name}" уже загружается.` });

      return null;
    }

    const clientFileUid = uuidv4();

    setStagedFiles(prev => prev.filter(sf => !(sf.file.name === file.name && sf.file.lastModified === file.lastModified && sf.error)));

    const newStagedFileEntry: StagedFile = {
      uid: clientFileUid,
      file: file,
      uploading: true,
      error: false,
    };

    setStagedFiles((prev) => [...prev, newStagedFileEntry]);

    try {
      const formData = new FormData();
      formData.append('chat_uid', chatUid);
      formData.append('document', file);

      const response = await fetch(fileUploadUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { message: response.statusText };
        }
        throw new Error(`Ошибка сервера: ${response.status} ${errorData?.message || response.statusText}`);
      }

      const uploadedFilesFromServer: ServerFileInfo[] | ServerFileInfo = await response.json();

      const serverFileInfo = Array.isArray(uploadedFilesFromServer) ? uploadedFilesFromServer[0] : uploadedFilesFromServer;


      if (!serverFileInfo || !serverFileInfo.uid || !serverFileInfo.url) {
        throw new Error('Некорректный ответ от сервера после загрузки файла.');
      }

      setStagedFiles((prev) =>
        prev.map((sf) =>
          sf.uid === clientFileUid
            ? { ...sf, uploading: false, serverFileInfo: serverFileInfo, error: false }
            : sf
        )
      );

      message.success({ content: `Файл "${file.name}" загружен.` });

      return serverFileInfo;
    } catch (error: any) {
      setStagedFiles((prev) =>
        prev.map((sf) =>
          sf.uid === clientFileUid
            ? { ...sf, uploading: false, error: true }
            : sf
        )
      );
      message.error({ content: `Ошибка загрузки ${file.name}: ${error.message}` });

      return null;
    }
  };

  const handleBeforeUpload = (file: RcFile, currentBatchFileList: RcFile[]) => {
    if (file.size > MAX_FILE_SIZE * 1024 * 1024) {
      message.error(`Файл ${file.name} слишком большой (макс. ${MAX_FILE_SIZE}MB).`);
      return Upload.LIST_IGNORE;
    }
    const numAlreadyStaged = stagedFiles.filter(sf => !sf.error).length;
    const numSlotsAvailable = MAX_FILES - numAlreadyStaged;

    if (numSlotsAvailable <= 0) {
      message.warning(`Лимит в ${MAX_FILES} файлов уже достигнут. Файл ${file.name} не будет добавлен.`);
      return Upload.LIST_IGNORE;
    }

    const fileIndexInCurrentBatch = currentBatchFileList.findIndex(f => f.uid === file.uid);

    if (fileIndexInCurrentBatch >= numSlotsAvailable) {
      if (fileIndexInCurrentBatch === numSlotsAvailable && currentBatchFileList.length > numSlotsAvailable) {
        message.warning(`Выбрано слишком много файлов. Будут добавлены только первые ${numSlotsAvailable} из допустимых, не превышая общий лимит в ${MAX_FILES} файлов.`);
      }
      return Upload.LIST_IGNORE;
    }

    handleFileUpload(file);
    return false;
  };

  const handleRemoveStagedFile = async (fileToRemove: StagedFile) => {
    if (fileToRemove.serverFileInfo && fileToRemove.serverFileInfo.uid) {
      try {
        const deleteUrl = `${fileDeleteUrl.endsWith('/') ? fileDeleteUrl : fileDeleteUrl + '/'}${fileToRemove.serverFileInfo.uid}`;

        const response = await fetch(deleteUrl, {
          method: 'DELETE',
        });

        if (!response.ok) {
          let errorData;
          try {
            errorData = await response.json();
          } catch (e) {
            errorData = { message: response.statusText };
          }
          message.error(`Ошибка удаления файла "${fileToRemove.file.name}" с сервера: ${errorData?.message || response.statusText}`);
        } else {
          message.info(`Файл "${fileToRemove.file.name}" удален с сервера.`);
        }
      } catch (error: any) {
        message.error(`Ошибка при попытке удалить файл "${fileToRemove.file.name}" с сервера: ${error.message}`);
      }
    }

    setStagedFiles((prev) => prev.filter((sf) => sf.uid !== fileToRemove.uid));

    if (!fileToRemove.uploading && !fileToRemove.error && !(fileToRemove.serverFileInfo && fileToRemove.serverFileInfo.uid)) {
      message.info(`Файл "${fileToRemove.file.name}" удален из списка.`);
    } else if (fileToRemove.error) { }
  };

  const handleInternalSend = async () => {
    const trimmedMessage = messageInput.trim();
    const filesToAttach: ServerFileInfo[] = stagedFiles
      .filter((sf) => sf.serverFileInfo && !sf.error && !sf.uploading)
      .map((sf) => sf.serverFileInfo!);

    if (isSendDisabled) {
      if (isAnyFileUploading) {
        message.info("Дождитесь завершения загрузки файлов перед отправкой.");
      } else if (trimmedMessage === '' && filesToAttach.length === 0) {
        message.warning('Введите сообщение или прикрепите файлы.');
      }

      return;
    }

    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      message.error(`Сообщение слишком длинное. Максимум ${MAX_MESSAGE_LENGTH} символов.`);

      return;
    }

    await onSend(trimmedMessage, filesToAttach);
    setMessageInput('');
    setStagedFiles([]);
  };

  return (
    <div style={{
      width: '100%',
      padding: 12,
      background: '#fafafa',
      border: '1px solid rgb(195, 195, 195)',
      borderRadius: '20px'
    }}>
      {stagedFiles.length > 0 && (
        <div
          style={{
            marginBottom: '10px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            padding: '10px',
            border: '1px solid #f0f0f0',
            borderRadius: '4px',
            background: '#fafafa',
          }}
        >
          {stagedFiles.map((stagedFileItem) => (
            <div
              key={stagedFileItem.uid}
              style={{
                width: 'calc(50% - 4px)',
                maxWidth: '200px',
                minWidth: '150px',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '8px',
                border: `1px solid ${stagedFileItem.error ? 'red' : '#e8e8e8'}`,
                borderRadius: '4px',
                background: '#fff',
              }}
            >
              {stagedFileItem.uploading && (
                <Spin size="small" style={{ position: 'absolute', top: '5px', right: '25px', zIndex: 1 }} />
              )}
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                size="small"
                onClick={() => handleRemoveStagedFile(stagedFileItem)}
                style={{ position: 'absolute', top: '1px', right: '1px', zIndex: 1 }}
                title="Удалить файл"
                disabled={stagedFileItem.uploading}
              />
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px', width: '100%' }}>
                <FileDisplay fileName={stagedFileItem.file.name} fileType={stagedFileItem.file.type} size={20} />
              </div>
              <Text type="secondary" style={{ fontSize: '11px' }}>
                {(stagedFileItem.file.size / 1024).toFixed(1)} KB
                {stagedFileItem.error && <span style={{ color: 'red', marginLeft: '5px' }}>Ошибка</span>}
                {!stagedFileItem.uploading && stagedFileItem.serverFileInfo && !stagedFileItem.error && <span style={{ color: 'green', marginLeft: '5px' }}>Готово</span>}
              </Text>
            </div>
          ))}
        </div>
      )}

      <TextArea
        value={messageInput}
        onChange={(e) => setMessageInput(e.target.value)}
        placeholder={loading ? "Отправка..." : "Введите сообщение (Ctrl+Enter для новой строки)"}
        autoSize={{ minRows: 1, maxRows: 8 }}
        style={{
          resize: 'none',
          marginBottom: '8px',
        }}
        disabled={loading}
        maxLength={MAX_MESSAGE_LENGTH}
        onPressEnter={(e) => {
          if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            const textarea = e.target as HTMLTextAreaElement;
            const { selectionStart, selectionEnd } = textarea;
            const currentValue = messageInput;
            const newValue =
              currentValue.substring(0, selectionStart) +
              '\n' +
              currentValue.substring(selectionEnd);
            setMessageInput(newValue);
            setTimeout(() => {
              textarea.selectionStart = textarea.selectionEnd = selectionStart + 1;
            }, 0);
          } else if (!e.shiftKey && !e.ctrlKey && !e.altKey && e.key === 'Enter') {
            e.preventDefault();
            if (!isSendDisabled) {
              handleInternalSend();
            } else {
              message.info("Дождитесь завершения загрузки файлов перед отправкой.")
            }
          }
        }}
      />
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text type="secondary" style={{ fontSize: '12px' }}>
          {messageInput.length} / {MAX_MESSAGE_LENGTH}
        </Text>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Upload
            accept={ACCEPTED_FILE_TYPES}
            showUploadList={false}
            multiple
            beforeUpload={handleBeforeUpload}
            disabled={loading || isAnyFileUploading || stagedFiles.filter(sf => !sf.error).length >= MAX_FILES}
          >
            <Button
              shape="circle"
              icon={<PaperClipOutlined />}
              disabled={loading || isAnyFileUploading || stagedFiles.filter(sf => !sf.error).length >= MAX_FILES}
              title="Прикрепить файлы"
            />
          </Upload>
          <Button
            type="primary"
            shape="circle"
            icon={loading || isAnyFileUploading ? <Spin indicator={<LoadingOutlined style={{ fontSize: 16, color: '#fff' }} spin />} /> : <SendOutlined />}
            onClick={handleInternalSend}
            disabled={isSendDisabled}
            title="Отправить"
          />
        </div>
      </div>
    </div>
  );
}