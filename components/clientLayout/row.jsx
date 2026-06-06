export const rowStyle = {
  display: 'flex',
  flexDirection: 'row',
  flexWrap: 'wrap',
  width: '100%',
};

export function Row(props) {
  return (
    <div
      className={props.className}
      style={{ ...rowStyle, ...(props.style || {}) }}
    >
      {props.children}
    </div>
  );
}
