import styles from './contact.module.css';
import React from 'react';
import Rain from '../../components/rain/rain';
import NeonText from '../../components/neonText/neonText';
const Contact = () => {

  return (
    <div>
      <section className="dark-section full-screen centered">
        <Rain fullpage={true} />
        <NeonText
          goodbye={`${"contact me@davidpuerto.com"}`}
          hello="Response in <br />2-3 business days."
        />
      </section>
    </div>
  );
};

export default Contact;
