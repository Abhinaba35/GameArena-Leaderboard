const { z } = require('zod');


const submitScoreSchema = z.object({
  user_id: z.number().int().positive({
    message: 'user_id must be a positive integer'
  }),
  score: z.number().int().min(0).max(1000000, {
    message: 'score must be between 0 and 1,000,000'
  }),
  game_mode: z.string().min(1).max(50).optional().default('solo')
});


const userIdParamSchema = z.object({
  userId: z.string().regex(/^\d+$/, {
    message: 'userId must be a valid number'
  }).transform(Number)
});


const paginationSchema = z.object({
  limit: z.string().optional().default('10').transform(Number).pipe(
    z.number().int().min(1).max(100)
  ),
  offset: z.string().optional().default('0').transform(Number).pipe(
    z.number().int().min(0)
  )
});


function validateRequest(schema, source = 'body') {
  return async (req, res, next) => {
    try {
      const dataToValidate = source === 'body' ? req.body : 
                            source === 'params' ? req.params :
                            source === 'query' ? req.query : req.body;
      
      const validated = await schema.parseAsync(dataToValidate);
      
      if (source === 'body') req.body = validated;
      if (source === 'params') req.params = validated;
      if (source === 'query') req.query = validated;
      
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
      next(error);
    }
  };
}

module.exports = {
  submitScoreSchema,
  userIdParamSchema,
  paginationSchema,
  validateRequest,
};
