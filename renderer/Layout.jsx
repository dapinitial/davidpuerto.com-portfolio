import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { childrenPropType } from './PropTypeValues';
import { PageContextProvider } from './usePageContext';
import ClientLayout from '../components/clientLayout/clientLayout';
import './css/index.css';

Layout.propTypes = {
  pageContext: PropTypes.any,
  children: childrenPropType,
};

export default function Layout({ pageContext, children }) {
  return (
    <React.StrictMode>
      <PageContextProvider pageContext={pageContext}>
        {/* Global PreloaderInfinite */}

        <ClientLayout>{children}</ClientLayout>
      </PageContextProvider>
    </React.StrictMode>
  );
}

export { Layout };
