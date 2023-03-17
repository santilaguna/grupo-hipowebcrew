
module.exports = (sequelize, DataTypes) => {
  const diet = sequelize.define('diet', {
    name: DataTypes.STRING,
    weeks: DataTypes.INTEGER,
    meals: DataTypes.JSONB,
    observation: DataTypes.STRING,
  }, {
    getterMethods: {

    },
  });
  diet.associate = function (models) {
    diet.belongsTo(models.user);
  };

  /*
  diet.prototype.getPrice = async function getPrice(mealsList) {
    try {
      const ret =
      return ret;
    } catch (err) {
      return 0;
    }
  };
  // */

  return diet;
};
