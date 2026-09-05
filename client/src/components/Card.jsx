import './Card.css';

// A surface panel. `as` lets a card be a <li>, <form>, etc. without new components.
export default function Card({ as: Tag = 'div', className = '', children, ...rest }) {
  return (
    <Tag className={`card ${className}`} {...rest}>
      {children}
    </Tag>
  );
}
