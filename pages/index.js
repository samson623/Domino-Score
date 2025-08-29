function Home() {
  return null;
}

module.exports = Home;

module.exports.getServerSideProps = async function () {
  return {
    redirect: {
      destination: '/index.html',
      permanent: false,
    },
  };
};
