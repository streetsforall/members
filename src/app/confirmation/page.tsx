export default function Page() {
  return (
    <div
      style={{
        backgroundColor: 'white',
        borderRadius: '1rem',
        maxWidth: '480px',
        margin: '0 auto',
        padding: '2rem',
      }}
    >
      <h1
        style={{
          color: 'var(--blue)',
          fontFamily: 'serif',
          fontStyle: 'italic',
          marginTop: 0,
        }}
      >
        You're in the club!
      </h1>
      <p
        style={{
          marginBottom: 0,
        }}
      >
        Thank you for supporting Streets for All. You should receive a
        confirmation email shortly with a link to log into the membership
        portal.
      </p>
    </div>
  );
}
