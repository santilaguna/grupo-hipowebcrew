/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
/* eslint-disable react/no-access-state-in-setstate */
/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable jsx-a11y/control-has-associated-label */
/* eslint-disable no-underscore-dangle */
/* eslint-disable react/destructuring-assignment */
/* eslint-disable react/prop-types */
/* eslint-disable no-plusplus */
import React from 'react';
import * as yup from 'yup';
// import ReactDOM from 'react-dom';
// import Select from 'react-select'

const schema = yup.object().shape({
  name: yup.string()
    .required('Debes ingresar un nombre')
    .min(3, 'largo mínimo es 3')
    .max(255, 'largo máximo es 255'),
  foods: yup.array()
    .required('alimentos requeridos')
    .min(1, 'mínimo un alimento'),
  recipe_description: yup.string()
    .required('descripción requerida')
    .min(1, 'largo mínimo 1')
    .max(255, 'largo máximo es 255'),
});

export default class FormMeals extends React.Component {
  constructor(props) {
    super(props);

    this.handleDelete = this.handleDelete.bind(this);
    this.handleAdd = this.handleAdd.bind(this);
    this.handleInput1 = this.handleInput1.bind(this);
    this.handleInput2 = this.handleInput2.bind(this);
    this.handleFormChange = this.handleFormChange.bind(this);
    this.handleFormSubmit = this.handleFormSubmit.bind(this);
    this.fetchForm = this.fetchForm.bind(this);

    this.meal = JSON.parse(this.props.meal);
    this.isNewRecord = (this.props.newrec === 'true');

    const foodlist = JSON.parse(this.props.foodlist);
    const mealfood = JSON.parse(this.props.mealfood);
    const initialSelected = [];
    const notSelected = [];
    const initialOptions = [];
    for (let j = 0; j < foodlist.length; j++) {
      const element = foodlist[j];
      let breaked = false;
      for (let i = 0; i < mealfood.length; i++) {
        if (element.id === mealfood[i].id) {
          initialOptions.push({ value: element.id, label: element.name, selected: true });
          initialSelected.push({ value: element.name, hide: false });
          breaked = true;
          break;
        }
      }
      if (!breaked) {
        initialOptions.push({ value: element.id, label: element.name, selected: false });
        notSelected.push({ value: element.name, hide: false });
      }
    }

    this.state = {
      selected: initialSelected,
      notSelected,
      options: initialOptions,
      error: '',
    };
  }

  fetchForm(formData) {
    this.setState({ error: '' });
    const data = new FormData(formData);
    data.append('foods', Array.from(
      this.state.options.filter((opt) => opt.selected === true),
      (opt) => opt.value,
    ));
    // console.log(data, data.get('foods'));
    let method_ = 'PATCH';
    if (this.isNewRecord) {
      method_ = 'POST';
    }
    fetch(this.props.path, {
      method: method_,
      body: data,
    })
      .then((response) => {
        console.log(response, this.props.path);
        if (response.redirected === true) {
          window.location.replace(response.url);
          return response.text();
        }
        throw 'nice try';
      })
      .catch((err) => {
        console.log(err);
      });
  }

  handleAdd(toAddFood) {
    const newOptions = [...this.state.options];
    const index = this.state.options.findIndex((opt) => toAddFood === opt.label);
    const modified = { ...newOptions[index] };
    modified.selected = true;
    newOptions[index] = modified;
    this.setState({
      selected: [...this.state.selected, { value: toAddFood, hide: false }],
      notSelected: this.state.notSelected.filter(
        (food) => toAddFood !== food.value,
      ),
      options: newOptions,
    });

    yup.reach(schema, 'foods').validate([...this.state.selected, { value: toAddFood, hide: false }])
      .then(this.setState({
        error: '',
      })).catch(
        (error) => this.setState({
          error: error.errors[0],
        }),
      );
  }

  handleDelete(toDeleteFood) {
    const newOptions = [...this.state.options];
    const index = this.state.options.findIndex((opt) => toDeleteFood === opt.label);
    const modified = { ...newOptions[index] };
    modified.selected = false;
    newOptions[index] = modified;
    this.setState({
      selected: this.state.selected.filter(
        (food) => toDeleteFood !== food.value,
      ),
      notSelected: [...this.state.notSelected, { value: toDeleteFood, hide: false }],
      options: newOptions,
    });

    yup.reach(schema, 'foods').validate(this.state.selected.filter(
      (food) => toDeleteFood !== food.value,
    )).then(this.setState({
      error: '',
    })).catch(
      (error) => this.setState({
        error: error.errors[0],
      }),
    );
  }

  // eslint-disable-next-line class-methods-use-this
  handleInput1(event) {
    const word = event.target.value;
    const newList1 = [];
    this.state.selected.forEach((li) => (li.value.indexOf(word) > -1
      ? newList1.push({ value: li.value, hide: false })
      : newList1.push({ value: li.value, hide: true })
    ));
    this.setState({
      selected: newList1,
    });
  }

  // eslint-disable-next-line class-methods-use-this
  handleInput2(event) {
    const word = event.target.value;
    const newList2 = [];
    this.state.notSelected.forEach((li) => (li.value.indexOf(word) > -1
      ? newList2.push({ value: li.value, hide: false })
      : newList2.push({ value: li.value, hide: true })
    ));
    this.setState({
      notSelected: newList2,
    });
  }

  // eslint-disable-next-line class-methods-use-this
  handleFormChange(event) {
    const inputVar = event.target.name;
    if (inputVar !== 'ignore' && inputVar !== 'image') {
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

  handleFormSubmit(event) {
    event.preventDefault();
    const { target } = event;
    schema.validate({
      name: target.name.value,
      foods: this.state.selected,
      recipe_description: target.recipe_description.value,
    }).then(() => this.fetchForm(target))
      .catch(
        (error) => this.setState({
          error: error.errors[0],
        }),
      );
  }

  render() {
    const {
      selected, notSelected, options, error,
    } = this.state;

    return (
      <div>
        <div className="form-container">
          <form
            id="form1"
            encType="multipart/form-data"
            onChange={(event) => this.handleFormChange(event)}
            onSubmit={(event) => this.handleFormSubmit(event)}
          >
            <div className="row">
              <div className="col-25" />
              <div className="col-75">
                <input type="text" name="name" defaultValue={this.meal.name} placeholder="Ingresa el nombre..." />
              </div>
            </div>
            <div className="row">
              <div className="col-25">
                <img src={this.meal.image} alt="" />
              </div>
              <div className="col-75 selectArchivo">
                <input type="file" name="image" placeholder="Ingresa una imagen del alimento..." />
              </div>
            </div>
            <div className="row">
              <div className="col-25">
                <label htmlFor="recipe_description" value="Preparación" />
              </div>
              <div className="col-75">
                <textarea type="text" name="recipe_description" placeholder="Describe como preparar tu comida..." defaultValue={this.meal.recipe_description} />
              </div>
            </div>
            <div className="row">
              <div className="col-25">
                <label htmlFor="foods" value="Selecciona alimentos:" />
              </div>
              <div className="col-25 searchable searchable1" id="searchable1">
                <input id="list1_input" name="ignore" type="text" placeholder="busca para quitar un alimento" onChange={this.handleInput1} />
                <ul id="list1" name="list1">
                  {selected.map((element) => (
                    <li
                      hidden={element.hide}
                      key={element.value}
                      onClick={() => this.handleDelete(element.value)}
                    >
                      {element.value}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="col-25 searchable searchable2" id="searchable2">
                <input id="list2_input" name="ignore" type="text" placeholder="busca para agregar un alimento" onChange={this.handleInput2} />
                <ul id="list2" name="list2">
                  {notSelected.map((element) => (
                    <li
                      hidden={element.hide}
                      key={element.value}
                      onClick={() => this.handleAdd(element.value)}
                    >
                      {element.value}
                    </li>
                  ))}
                </ul>
              </div>
              <select
                value={
                  Array.from(options.filter((opt) => opt.selected === true),
                    (opt) => opt.value)
                }
                id="foods"
                name="foods"
                multiple
                disabled
              >
                {options.map(
                  (element) => (
                    <option key={element.value} value={element.value}>
                      {element.label}
                    </option>
                  ),
                )}
              </select>
            </div>
            <div className="row error">
              <div className="field">
                <input
                  type="submit"
                  name={this.isNewRecord ? 'create' : 'update'}
                  value={this.isNewRecord ? 'Create' : 'Update'}
                  id="button1"
                />
                <i>
                  {error}
                </i>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  }
}
