// commitlint.config.js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // nueva funcionalidad
        'fix',      // correccion de bug
        'docs',     // solo documentacion
        'style',    // formato, sin cambio logico
        'refactor', // refactoring sin feat ni fix
        'test',     // agregar o corregir tests
        'chore',    // tareas de mantenimiento, deps, CI
        'perf',     // mejora de rendimiento
        'ci',       // cambios en CI/CD
        'revert',   // revertir commit
      ],
    ],
    'subject-case': [0],
    'subject-max-length': [2, 'always', 72],
    'body-max-line-length': [1, 'always', 100],
  },
};
