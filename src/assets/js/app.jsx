/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import ReactDOM from 'react-dom';
import DietForm from './components/DietForm';
import DietCalendar from './components/DietCalendar';
import FormMeals from './components/FormMeals';


if (document.getElementById('diet-form')) {
  const rootDietForm = document.getElementById('diet-form');
  // console.log(root_.dataset);
  ReactDOM.render(<DietForm {...(rootDietForm.dataset)} />, rootDietForm);
}

if (document.getElementById('formMeals')) {
  const rootMealForm = document.getElementById('formMeals');
  ReactDOM.render(<FormMeals {...(rootMealForm.dataset)} />, rootMealForm);
}

if (document.getElementById('calendar')) {
  const rootCalendar = document.getElementById('calendar');
  ReactDOM.render(<DietCalendar {...(rootCalendar.dataset)} />, rootCalendar);
}
