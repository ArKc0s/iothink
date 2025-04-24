const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'IoThink API',
      version: '1.0.0',
      description: 'Documentation de l’API du backend Express'
    },
    components: {
      securitySchemes: {
        bearerAuth: { 
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        }
      }
    },
    security: [
      {
        bearerAuth: [] 
      }
    ]
  },
  apis: ['./routes/*.js'],
};
const swaggerSpec = swaggerJSDoc(options);

function setupSwagger(app) {

  const swaggerUiOptions = {
    explorer: true
  };
  
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));
}

module.exports = setupSwagger;
