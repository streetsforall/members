// Event details come from the events table, see getEvents in server/db

export interface event {
    id: number;
    date: string | null;
    link: string | null;
    description: string | null;
}

const Events = ({ events }: { events?: event[] | null }) => {

    if (!events?.length) {
        return (
            <div className='user_section'>
                <div className='section_header'>
                    <h2>Next Member Event Coming Soon!</h2>
                </div>
            </div>
        )
    }

    return (
        <>
            {events.map((event) => (
                <div className='user_section' key={event.id}>
                    <div className='section_header'>
                        <p>Next Member Event:</p>
                    </div>

                    {event.description ?
                        <div className='section_content'>
                            <p>{event.date ? `${event.date}` : ''}</p>
                            <p style={{ whiteSpace: 'pre-line', fontWeight: 'bold' }}>{event.description}</p>
                              {event.link ? <a href={event.link}><button>RSVP</button></a> : ''}
                        </div>
                        : ''}
                </div>
            ))}
        </>
    )

}

export default Events;
