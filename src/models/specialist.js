
module.exports = (sequelize, DataTypes) => {
  const specialist = sequelize.define('specialist', {
    userId: DataTypes.INTEGER,
    profession: DataTypes.STRING,
    document: DataTypes.STRING,
    status: DataTypes.STRING,
  }, {});

  return specialist;
};
