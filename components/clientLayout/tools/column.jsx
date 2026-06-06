import React, { forwardRef } from 'react';

export const columnStyle = {
  display: 'flex',
  flexDirection: 'column',
  flexBasis: '100%',
  flex: 1,
  position: 'relative'
};

export const Column = forwardRef(({ children, style, ...props }, ref) => {
  return (
    <div ref={ref} style={{ ...columnStyle, ...style }} {...props}>
      {children}
    </div>
  );
});
