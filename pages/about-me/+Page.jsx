import styles from './about-me.module.css';
import Rain from '../../components/rain/rain';
import { Container } from '../../components/clientLayout/tools';
import ClippedImage from '../../components/clippedImage/clippedImage';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

const AboutMe = () => {
  return (
    <section>
      <article className='dark-section'>
        <h2 className="text-align-center" style={{ paddingTop: 80 }}>
          <em>What are some things<br /> you</em>  <span className={styles.textMask}>might not know</span> <em>about me...</em>
        </h2>
        <Rain />
        <ClippedImage
          imageSrc="/images/spacelabforever.jpg"
          videoSrc="/images/about.mov"
        />
      </article>
      <article className='dark-section'>
        <hr /><hr />
        <Container>
          <h4><em>I take</em> <span className={styles.textMask}>calculated</span> <em>risks</em></h4>
          <p>Alpine escapades coming soon...</p>
          <hr />
          <hr />
        </Container>
      </article>
      <article className='light-section'>
        <hr /><hr />
        <Container>
          <h4><em>I run, swim, and more on</em> <span className={styles.textMask}> Strava</span> <em></em></h4>
          <p>Training + Performance data coming soon...</p>
          <hr />
          <hr />
        </Container>
      </article>
      <article className='dark-section'>
        <hr /><hr />
        <Container>
          <h4><em>Have mercy </em> <span className={styles.textMask}>on the dishwasher</span> <em></em></h4>
          <p>Recipes for paella, pastelon, and arepas coming soon...</p>
          <hr />
          <hr />
        </Container>
      </article>
      <article className='light-section'>
        <hr /><hr />
        <Container>
          <h4><em>I have some </em> <span className={styles.textMask}>Side Projects</span> <em></em></h4>
          <p>Life hacks, coding, vehicle modification, home improvements, etc. coming soon...</p>
          <hr />
          <hr />
        </Container>
      </article>
      <article className='dark-section'>
        <hr /><hr />
        <Container>
          <h4><em>I can still</em> <span className={styles.textMask}>get down at the roller rink</span> <em></em></h4>
          <p>Details coming soon...</p>
          <hr />
          <hr />
        </Container>
      </article>
    </section>
  );
};

export default AboutMe;
