export const columnStyle = {
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
};

export function Column(props) {
  return (
    <div
      className={props.className}
      style={{ ...columnStyle, ...(props.style || {}) }}
    >
      {props.children}
    </div>
  );
}
