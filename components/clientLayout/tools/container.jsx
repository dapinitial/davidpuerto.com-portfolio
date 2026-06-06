import React, { forwardRef } from 'react';

export const containerStyle = {
  position: 'relative',
  boxSizing: 'border-box',
  width: '100%',
  margin: '0 auto',
  paddingLeft: '80px',
  paddingRight: '80px',
  maxWidth: '1320px'
};

export const Container = forwardRef(({ className = '', style = {}, children, ...rest }, ref) => {
  return (
    <div
      ref={ref}
      className={className}
      style={{ ...containerStyle, ...style }}
      {...rest}
    >
      {children}
    </div>
  );
});