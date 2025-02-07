module.exports = (sequelize, DataTypes) => {
  const Message = sequelize.define("Message", {
    uuid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true,
    },
    senderUuid: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    recipientUuid: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // Ejemplo de definición en el modelo Message
isRead: {
  type: DataTypes.BOOLEAN,
  allowNull: false,
  defaultValue: false,
  field: 'isRead'
},

  });

  return Message;
};
