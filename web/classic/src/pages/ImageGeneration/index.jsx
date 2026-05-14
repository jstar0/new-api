/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.
*/

import React, { useEffect } from 'react';
import { Spin, Typography } from '@douyinfe/semi-ui';

const { Text } = Typography;

export default function ImageGeneration() {
  useEffect(() => {
    window.location.replace('/image-generation');
  }, []);

  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <Spin size='large' />
      <Text type='tertiary'>正在打开图片工作台...</Text>
    </div>
  );
}
