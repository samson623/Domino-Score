function Home() {
  return null;
}

async function getServerSideProps() {
  return {
    redirect: {
      destination: '/index.html',
      permanent: false,
    },
  };
}

exports.default = Home;
exports.getServerSideProps = getServerSideProps;
