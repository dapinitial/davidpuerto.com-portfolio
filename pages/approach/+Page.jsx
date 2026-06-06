import styles from './approach.module.css';

import { useState, useEffect } from 'react';
import Image from '../../components/image/image';
import { Row, Column } from '../../components/clientLayout';
import TextToSpeechButton from '../../components/textToSpeechButton/textToSpeechButton';
import NeonText from '../../components/neonText/neonText';
import ScrollDown from '../../components/scrollDown/scrollDown'
import Rain from '../../components/rain/rain';

const Approach = () => {
  const [containerText, setContainerText] = useState('');

  const readContainerText = () => {
    const container = document.getElementById('containerId');
    if (container) {
      const textToRead = container.textContent || '';
      setContainerText(textToRead);
    }
  };

  useEffect(() => {
    readContainerText();
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  return (
    <>
      <Rain fullpage={true} />
      <section className={styles.section}>
        <NeonText
          goodbye='"Leave it better than you found it", "Prototypes are worth 1,000 meetings"'
          hello="design approach & process"
        />
        <ScrollDown />
      </section>
      <section className={styles.homepageSection}>
        <Row className={styles.bodycopyDetails}>
          <Column className={styles.textToSpeakButtonColumn}>
            <TextToSpeechButton textToRead={containerText} />
          </Column>
          <Column className={styles.readingDurationColumn}>
            <p>~4 minutes to read article</p>
            <p>Last updated 1/1/2024 via GitHub</p>
          </Column>
        </Row>
        <article className={styles.aboutSection}>
          <div id="containerId" className={styles.bodycopy}>
            <h1>
              Design Approach: Elevating digital experiences through empathy, prototyping,
              innovation.
            </h1>

            <h2>Introduction</h2>

            <p>
              My design approach is rooted in a deep commitment to producing and
              improving digital experiences by infusing them with data, empathy,
              and innovation. Just as climbers meticulously prepare for an
              ascent by setting objectives, strategizing with partners,
              mastering systems for mechanical advantage, maintaining physical
              readiness, and staying vigilant of changing weather and terrain
              conditions—I embark on every project with the same attention to
              detail, striving to leave a compelling impression on my audience.
              It&apos;s a journey and an adventure and sometimes we have to
              improvise. My role as a UX Engineer and product designer is
              nothing short of being a guide, enabling us to summit mountain
              after mountain after mountain...
            </p>
            <h2>User-Centric Innovation</h2>

            <p>
              At the heart of my design philosophy is a relentless dedication to
              enhancing peoples&apos; lives. I constantly challenge myself with
              the fundamental questions:
            </p>
            <ol>
              <li>
                &quot;Will our solution significantly enhance the current
                experience?&quot;
              </li>
              <li>
                &quot;How can we empirically demonstrate its validity?&quot;
              </li>
              <li>
                &quot;What are the tangible and intangible costs involved?&quot;
              </li>
              <li>
                &quot;What is the learning curve, and how quickly can they
                adapt?&quot;
              </li>
              <li>&quot;How effectively does our solution scale?&quot;</li>
              <li>&quot;Who have we left out?&quot;</li>
              <li>
                &quot;What technological challenges and constraints must we
                overcome?&quot;
              </li>
              <li>&quot;Is this still the best solution?&quot;</li>
            </ol>

            <Image
              className={styles.image}
              alt="David Puerto whiteboarding for Facebook."
              width={320}
              height={420}
              src="/images/jpg/facebookWhiteboard.jpg"
            />

            <p>
              These questions serve as my guiding principles, ensuring that the
              work is not merely a technical exercise playing to my design
              biases, but a meaningful improvement rooted in outcomes and
              supported by data. As a designer, I&apos;m in search of a solution
              to a problem. This solution remains mindful of the jobs that must
              be done, respecting budgets, needs, and timelines.
            </p>

            <h2>Design as Empowerment</h2>

            <p>
              As a design practioner, My design philosophy extends beyond
              aesthetics; it encompasses empowerment. By bridging the gap
              between design and implementation, I empower individuals and
              organizations to achieve more by realizing our potential. My
              multidisciplinary journey as a designer and software engineer has
              taught me the importance of collaboration, fostering
              relationships, and trust-building.
            </p>

            <h2>Prototyping as Catalyst:</h2>

            <p>
              Prototyping is the linchpin of my design process. Prototypes are
              not disposable artifacts; they are valuable tools that illuminate
              challenges and refine solutions. Each iteration gives us reusable
              assets for future prototypes. I&apos;ve learned to carefully
              assess addressing solving problems that don&apos;t exist by
              remaining mindful in the search of a better solution.
            </p>

            <h5 className={styles.subheading}>
              Prototyping helps formulate the main trajectory of a design
              by framing the mind around a continuous pursuit of better
              concepts.
            </h5>

            <p>
              Starting with whiteboard ideation and collaborative sessions with
              engineers and product teams, we evaluate what jobs the people we
              are designing for need to carry out. During this &quot;throwing
              spaghetti and seeing what sticks&quot; phase, we build off the
              most feasible wins, applying tried and true design thinking as we
              chart our course. From here we transform concepts into shareable
              treatments, user flows, scenarios, personas, and wireframes to
              keep our focus and avoid scope creep as we begin exploring these
              wireframe pathways with prototypes.
            </p>
            <p>
              The browser becomes our canvas, a secure space to collaborate and
              share our work as we interface with real data and employ code to
              shape interactions testing our design hypothesis, verifying and
              validating proceived notions along the way. This process ensures a
              comprehensive approach to problem-solving where we earn trust and
              validate our ideas in the medium we are designing for as we
              harness the power of programming to randomize our datasets and
              simulate seemingly authentic workflows delivering models that
              people can examine and explore. Through this period of design
              discovery further insights may be gleaned and addressed.
            </p>

            <p>
              These prototypes extend far beyond visual representations; they
              are functional assets that facilitate feedback and further
              development using simulated and actual data. Through active
              engagement in the design process, we uncover the work that truly
              matters. As the design process proceeds, leveraging tools like
              Figma or Sketch and other design tools, we begin to transform
              prototypes into works of art with editable design deliverables
              importing directly from the browser-based prototypes, refining
              namings resulting in design language and patterns.
            </p>

            <h2>Conclusion:</h2>

            <p>
              In the realm of design, actions speak louder than words. My design
              philosophy centers on delivering tangible, testable, and impactful
              results. We owe it to ourselves and our audience to ensure that
              they can access and rely on our designs to render across any
              device or platform, and that their basic needs are met. This is my
              standard and this is my craft that I am sedulously dedicated to
              honing.
            </p>

            <p>
              I think in terms of systems. I understand that the backbone of
              creating excellent digital and accessible web experiences is
              harnessing web technologies for data manipulation across those
              systems.
            </p>
            <p>
              I have proven track record for deep understanding of the technical
              concepts at play and the ability to synthesize complexity down to
              simplicity.
            </p>
            <p>
              I revel in the opportunity to make product decisions, construct
              design solutions, and participate in defining the vision of the
              end-to-end user experience. I love working across disciplines and
              collaborating with other teams to bring about the best outcome. As
              an end-user advocate, I drive peoples&apos; needs towards goals
              through pragmatic and intuitive design solutions.
            </p>
            <p>
              I understand and am wholeheartedly enthusiastic about modern web
              development. I am well-versed in the application of user-centered
              philosophies and interactive media design best practices. I
              distill evolving design work into patterns and capture those in
              articulate and insightful guidance for others to use as a creative
              springboard.
            </p>

            <p>
              As I align with Microsoft&apos;s vision of &quot;empowering every
              person and every organization on the planet to achieve more,&quot;
              I recognize that my diverse experiences have converged to this
              pivotal moment. My design approach is a fusion of innovation,
              empathy, and the unwavering commitment to making a significant
              difference in the digital landscape.
            </p>

            <blockquote>
              <h5 className={styles.subheading}>
                "If a picture is worth a thousand words—
                <br /> a prototype is worth a thousand meetings."
              </h5>
            </blockquote>
          </div>
        </article>
      </section>
    </>
  );
};

export default Approach;
