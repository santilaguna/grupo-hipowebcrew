/* eslint-disable no-console */
/* eslint-disable no-throw-literal */
/* eslint-disable no-plusplus */
/* eslint-disable jsx-a11y/anchor-is-valid */
/* eslint-disable react/prop-types */
/* eslint-disable react/destructuring-assignment */
/* eslint-disable react/no-access-state-in-setstate */
/* eslint-disable jsx-a11y/label-has-associated-control */
import React from 'react';
import ReactDOM from 'react-dom';
import * as yup from 'yup';

const schema = yup.object().shape({
  name: yup.string()
    .required('Debes ingresar un nombre')
    .min(3, 'largo mínimo es 3')
    .max(255, 'largo máximo es 255'),
  weeks: yup.number()
    .required('Debes ingresar una duracion')
    .min(1, 'mínimo una semana')
    .max(20, 'máximo 20 semanas'),
  observation: yup.string()
    .required('Observaciones requeridas')
    .min(3, 'largo mínimo es 3')
    .max(255, 'largo máximo es 255'),
});

export default class DietForm extends React.Component {
  constructor(props) {
    super(props);
    // constants, use this so we don't need to parse each time
    this.diet = JSON.parse(this.props.diet);
    this.mealsList = JSON.parse(this.props.mealslist);
    this.isNewRecord = (this.props.isnewrecord === 'true');

    this.member = React.createRef();
    this.container = React.createRef();

    this.addFields = this.addFields.bind(this);
    this.fasesComida = this.fasesComida.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleFormChange = this.handleFormChange.bind(this);
    this.handleFormSubmit = this.handleFormSubmit.bind(this);
    this.fetchForm = this.fetchForm.bind(this);
    this.state = {
      value: (this.isNewRecord
        ? []
        : Array.from(this.diet.meals, (bigMeal) => bigMeal.meals[0])  // TODO: edit later
      ),
      error: '',
    };
  }

  fetchForm(formData) {
    const data = new FormData(formData);
    data.append('mealsIds', this.state.value.join(','));
    let method = 'PATCH';
    if (this.isNewRecord) {
      method = 'POST';
    }
    console.log(data.get('mealsIds'));
    // /*
    fetch(this.props.submitpath, {
      method,
      body: data,
    }).then((response) => {
      console.log(response, this.props.submitpath);
      if (response.redirected === true) {
        window.location.replace(response.url);
        return response.text();
      }
      throw 'nice try';
    }).catch((err) => {
      console.log(err);
    });
    // */
  }

  handleFormSubmit(event) {
    event.preventDefault();
    const { target } = event;
    schema.validate({
      observation: target.observation.value,
      name: target.name.value,
      weeks: target.weeks.value,
    }).then(() => this.fetchForm(target))
      .catch(
        (error) => this.setState({
          error: error.errors[0],
        }),
      );
  }

  handleFormChange(event) {
    const inputVar = event.target.name;
    if (inputVar !== 'ignore' && inputVar !== 'member') {
      yup.reach(schema, inputVar).validate(event.target.value)
        .then(this.setState({
          error: '',
        })).catch(
          (error) => this.setState({
            error: error.errors[0],
          }),
        );
    }
  }

  handleChange(event, i) {
    const newVal = [...this.state.value];
    newVal[i] = event.target.value;
    this.setState({
      value: newVal,
    });
  }

  fasesComida(contador, stateValue) {
    const i = contador;
    return (
      <div className="Fases" key={`div${i}`}>
        <div className="row">
          <div className="col-25">
            <label>Nombre del horario de comida:</label>
          </div>
          <div className="col-75">
            <input type="text" name={`name meal${i}`} defaultValue={this.isNewRecord ? '' : this.diet.meals[i].name} />
          </div>
        </div>

        <div className="row">
          <div className="col-25">
            <label>Horario:</label>
          </div>
          <div className="col-75">
            { this.isNewRecord ? <input type="time" name={`time${i}`} />
              : <input type="time" name={`time${i}`} defaultValue={this.diet.meals[i].time} />}
          </div>
        </div>
        <div className="row">
          <div className="col-25">
            <label>Comidas:</label>
          </div>
          <div className="col-75">
            <select
              defaultValue={stateValue[i]}
              onChange={(e) => this.handleChange(e, i)}
              name={`meals${i}`}
              id={`meals${i}`}
            >
              {this.mealsList.map((element) => (
                <option id="myselect" key={element.id} value={element.id}>{element.name}</option>))}
            </select>
          </div>
        </div>
      </div>
    );
  }

  addFields(stateValue) {
    // Number of inputs to create
    let number;
    if (this.isNewRecord) {
      number = this.member.current.valueAsNumber;
      const newVal = [];
      for (let i = 0; i < number; i++) {
        newVal.push(this.mealsList[0].id);
      }
      this.setState({ value: newVal });
    } else {
      number = this.diet.meals.length;
    }
    // Container <div> where dynamic content will be placed
    const container = this.container.current;
    // Clear previous contents of the container
    while (container.child) {
      ReactDOM.unmountComponentAtNode(container);
    }
    const elements = [];
    for (let i = 0; i < number; i++) {
      elements.push(this.fasesComida(i, stateValue));
    }
    const X = React.createElement('div', {}, elements);
    ReactDOM.render(X, container);
  }

  RenderFases(stateValue) {
    if (this.isNewRecord) {
      return (
        <div className="row">
          <div className="col-25">
            <label htmlFor="fases"> Numero de fases de comida</label>
          </div>
          <div className="col-75">
            <input type="number" ref={this.member} name="member" />
            <a href="#" id="filldetails" onClick={() => this.addFields(stateValue)}>Seleccionar las comidas</a>
            <div id="container" ref={this.container} />
          </div>
        </div>
      );
    }
    return (
      <div className="row">
        <div id="container" ref={this.container} />
        <a href="#" onClick={() => this.addFields(stateValue)}>Editar Comidas</a>
      </div>
    );
  }

  RenderButton(error) {
    if (this.isNewRecord) {
      return (
        <div className="error">
          <input type="submit" name="create" value="Crear" id="button1" />
          <i>
            {error}
          </i>
        </div>
      );
    }
    return (
      <div className="error">
        <input type="submit" name="update" value="Actualizar" id="button1" />
        <i>
          {error}
        </i>
      </div>
    );
  }

  render() {
    const { value, error } = this.state;
    return (
      <form
        id="form1"
        onChange={(event) => this.handleFormChange(event)}
        onSubmit={(event) => this.handleFormSubmit(event)}
      >
        <div className="row">
          <div className="col-25">
            <label htmlFor="name">Nombre</label>
          </div>
          <div className="col-75">
            <input
              type="text"
              name="name"
              defaultValue={this.diet.name}
              placeholder="Ingresa el nombre..."
            />
          </div>
        </div>
        <div className="row">
          <div className="col-25">
            <label htmlFor="weeks">Semanas de duracion</label>
          </div>
          <div className="col-75">
            <input type="number" name="weeks" defaultValue={this.diet.weeks} />
          </div>
        </div>
        <div id="myselect">
          {this.RenderFases(value)}
        </div>
        <div className="row">
          <div className="col-25">
            <label htmlFor="observation">Observaciones</label>
          </div>
          <div className="col-75">
            <input
              type="text"
              name="observation"
              defaultValue={this.diet.observation}
              placeholder="Ingresa observaciones..."
            />
          </div>
        </div>
        <div className="field">
          {this.RenderButton(error)}
        </div>
      </form>
    );
  }
}
