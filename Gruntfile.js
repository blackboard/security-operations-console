module.exports = function( grunt )
{
  grunt.initConfig( {
    pkg : grunt.file.readJSON( 'package.json' ),
    jasmine_node : {
      specNameMatcher : "-spec",
      projectRoot : "./test/spec",
      forceExit : true,
      jUnit : {
        report : true,
        savePath : "./test/reports/junit/",
        useDotNotation : true,
        consolidate : true
      },
      useHelpers : true,
      verbose : false,
      coverage : {
        print : 'detail'
      }
    },
    bgShell : {
      coverage : {
        cmd : 'node ./node_modules/istanbul/lib/cli.js cover ./node_modules/jasmine-node/bin/jasmine-node ./test/spec --dir ./public/coverage'
      },
      cobertura : {
        cmd : 'node ./node_modules/istanbul/lib/cli.js report --root ./public/coverage --dir test/reports/coverage cobertura'
      }
    },
    jsdoc : {
      dist : {
        src : [ 'controllers', 'models' ],
        options : {
          destination : "public/javadoc",
          recurse : true,
          private : true
        }
      }
    }
  } );
  
  grunt.loadNpmTasks( 'grunt-jasmine-node' );
  grunt.loadNpmTasks( 'grunt-bg-shell' );
  grunt.loadNpmTasks( 'grunt-jsdoc' );

  grunt.registerTask( 'test', 'jasmine_node' );
  grunt.registerTask( 'coverage', [ 'bgShell:coverage' ] );
  grunt.registerTask( 'cobertura', [ 'bgShell:cobertura' ] );
  grunt.registerTask( 'doc', [ 'jsdoc' ] );
};

