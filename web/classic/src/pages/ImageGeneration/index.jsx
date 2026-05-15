/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.
*/

import React from 'react';
import ImagePlaygroundApp from './playground/App';
import './playground/playground.css';

export default function ImageGeneration() {
  return (
    <div className='newapi-image-playground min-h-[100dvh] bg-slate-50 pt-16 text-slate-950 dark:bg-zinc-950 dark:text-zinc-50'>
      <ImagePlaygroundApp />
    </div>
  );
}
