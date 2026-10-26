import React from 'react';
import { C } from '../constants';

export function Card({children, style}:{children:React.ReactNode; style?:React.CSSProperties}) {
  return (
    <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:16,...style}}>
      {children}
    </div>
  );
}