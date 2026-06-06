// https://vike.dev/onRenderClient
export { onRenderClient }

import ReactDOM from 'react-dom/client'
import { Layout } from './Layout'
import { getPageTitle } from './getPageTitle'
import { onPageTransitionStart } from './+onPageTransitionStart';
import { onPageTransitionEnd } from './+onPageTransitionEnd';

let root
function onRenderClient(pageContext) {
  const { Page } = pageContext

  // This onRenderClient() hook only supports SSR, see https://vike.dev/render-modes for how to modify onRenderClient()
  // to support SPA
  if (!Page) throw new Error('My onRenderClient() hook expects pageContext.Page to be defined')

  const container = document.getElementById('react-root')
  if (!container) throw new Error('DOM element #react-root not found')

  const page = (
    <Layout pageContext={pageContext}>
      <Page />
    </Layout>
  )

  if (pageContext.isHydration) {
    root = ReactDOM.hydrateRoot(container, page)
  } else {
    if (!root) {
      root = ReactDOM.createRoot(container)
    }
    root.render(page)
  }

  document.addEventListener('pageTransitionStart', onPageTransitionStart);
  document.addEventListener('pageTransitionEnd', onPageTransitionEnd);
  document.title = getPageTitle(pageContext)
}