import React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import RactToolTip from 'react-tooltip';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from "@fullcalendar/interaction";

import '../../styles/full_calendar.scss';

export default class DietCalendar extends React.Component {
  calendarComponentRef = React.createRef();
  mealsList = JSON.parse(this.props.mealslist);

  state = {
    calendarWeekends: true,
    calendarEvents: []
  };

  getCalendarEvents = () => {  
    let contador = 0;
    const allEvents = [];
    console.log(this.mealsList);
    this.mealsList.forEach(horario => {
      let classId = "color-";
      classId += contador;
      contador ++;

      horario.meals.forEach(meal => {
        var startTime = new Date();
        var endWeek = new Date();
        endWeek.setDate(startTime.getDate() + JSON.parse(this.props.duration)*7);
        //endTime default es 1 hora

        allEvents.push(
          {title: meal.name, 
            startTime:horario.time,
            startRecur:startTime,
            endRecur:endWeek, 
            allDay:false,
            className:classId
          })
        });
    });
    this.setState({calendarEvents: allEvents});
  }
  
  componentDidMount() {
    this.getCalendarEvents();
  }

  render() {
    return (
        <FullCalendar defaultView="dayGridMonth"
          header={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek"
          }}
          handleWindowResize={true}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          ref={this.calendarComponentRef}
          events={this.state.calendarEvents}
          weekends={this.state.calendarWeekends}
          height={"50%"}/>
    )
  }
}

