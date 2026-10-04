import CalendarApp from "../components/CalendarApp";

export default function Home() {
  return <CalendarApp />;
}

export async function getServerSideProps() {
  if (process.env.NEXT_PUBLIC_VIEWER_MODE === "true") {
    return { redirect: { destination: "/view", permanent: false } };
  }
  return { props: {} };
}
