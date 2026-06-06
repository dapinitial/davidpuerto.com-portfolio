import React, { forwardRef } from 'react';

export const rowStyle = {
  display: 'flex',
  flexDirection: 'row',
  flexWrap: 'wrap',
  width: '100%'
};

export const Row = forwardRef(({ className = '', style = {}, children, ...rest }, ref) => {
  return (
    <section
      ref={ref}
      className={className}
      style={{ ...rowStyle, ...style }}
      {...rest}
    >
      {children}
    </section>
  );
});
