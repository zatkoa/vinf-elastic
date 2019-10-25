var url = "http://localhost:9200/produkty/";
var url_search = url + '_search';

angular.module('app', ['ngSanitize'])
 
.controller('MainController', function($scope, $http) {
    $scope.results = { hits: { total: { value: 0}}};
    $scope.searchTerm = '';
    $scope.sortByPrice = false;
    $scope.searchAsPhrase = false;
    $scope.currentPage = 1;
    $scope.numPerPage = 10;
    $scope.maxPages = 1;
    $scope.fuzzyQuery = false;
    $scope.aggregations = [];
    $scope.size = '';
    $scope.sizes = [];
    
    $scope.getSizes = function() {

        let params = {
            "size": 0,
            "aggs" : {
                "uniq_sizes" : {
                    "terms" : {
                        "field" : "sizes.keyword"
                    }
                }
            }
        };
        // request
        $http({
            url: url_search,
            method: 'POST',
            data: params
        }).then(function(response) {
            $scope.sizes = response.data.aggregations.uniq_sizes.buckets;
            setTimeout(function() {
                var elemsSelect = document.querySelectorAll('select');
                var instancesSelect = M.FormSelect.init(elemsSelect);
            }, 100);
        });
        
    }

    $scope.getResults = function(resetPaging = false) {
        if (resetPaging) {
            $scope.currentPage = 1;
            $scope.maxPages = 1;
        }
        var match;
        var description;

        // phrase?
        if ($scope.searchAsPhrase === true) {
            description = { 
                "description" : $scope.searchTerm,
            };
            match = { "match_phrase": description}
        } else {
            // fuzzy ?
            if ($scope.fuzzyQuery === true) {
                description = 
                { 
                    "description" : {
                        "query" : $scope.searchTerm,
                        "fuzziness" : "AUTO",
                        "fuzzy_transpositions" : true,
                        "max_expansions": 50,
                        "prefix_length": 0,
                    }
                };
            } else {
                description = { 
                    "description" : $scope.searchTerm,
                };
            }

            match = { "match": description }
        }


        params = {
            "query": {
                "bool" : {
                    "must": [
                        match
                    ],
                    "should" : [
                        { "match" : { "model" : { "query" : $scope.searchTerm, "boost" : 5 } } },
                        { "match" : { "brand" : { "query" : $scope.searchTerm, "boost" : 1.5 } } } 
                    ]
                }
            },
            "size": $scope.numPerPage,
            "from": ($scope.currentPage - 1) * $scope.numPerPage,

            "highlight" : {
                "pre_tags" : ["<em>"],
                "post_tags" : ["</em>"],
                "fields" : [
                    { "description" : {}, },
                    { "query" : {} },
                    { "model" : {} },
                    { "brand" : {} },
                ]
            }, 
          };
          
        // sort
        if ($scope.sortByPrice === true ) {
            params['sort'] = [
                { "price" : {"order" : "asc"}},
                "_score"
            ];
        }
        // range
        var range = slider.noUiSlider.get();
        var boost = range[0] === '0' && range[1] === '1000' ? 1.0 : 2.0;
        params['query']["bool"]["must"].push( 
            {
                "range" : {
                    "price" : {
                        "gte" : range[0],
                        "lte" : range[1],
                        "boost" : boost
                    }
                }
            }
        );

        // filter
        if  ($scope.size && $scope.size != 'ALL') {
            params['query']['bool']['filter'] = {
                "term" : { "sizes.keyword" : $scope.size }
            }
        }


        // let aggs = {
        //     "top_tags": {
        //         "terms": {
        //             "field": "brand",
        //             "size": 10
        //         },
        //         "aggs": {
        //             "top_sales_hits": {
        //                 "top_hits": {
        //                     "sort": [
        //                         {
        //                             "price": {
        //                                 "order": "desc"
        //                             }
        //                         }
        //                     ],
        //                     "_source": {
        //                         "includes": [ "model", "price" ]
        //                     },
        //                     "size" : 1
        //                 }
        //             }
        //         }
        //     }
        // };

        // request
        $http({
            url: url_search,
            method: 'POST',
            data: params
        }).then(function(response) {
            $scope.results = response.data;
            $scope.maxPages = Math.ceil(response.data.hits.total.value / $scope.numPerPage);
        });
    }

    $scope.getAutocomplete = function() {

        var params = {
            "suggest": {
                "search-suggest": {
                "prefix": $scope.searchTerm,
                    "completion": {
                        "field": "model",
                        "skip_duplicates": true,
                        "size": 5,
                        "fuzzy": {
                            "fuzziness": 2
                        }
                }
                }
            }
        };
        // request
        $http({
            url: url_search,
            method: 'POST',
            data: params
        }).then(function(response) {
            let suggests = response.data.suggest['search-suggest'][0].options;
            let autocompleteSuggestions = {};
            for (let i = 0; i < suggests.length; i++) {
                autocompleteSuggestions[suggests[i].text] = null
            }
            instance.updateData(autocompleteSuggestions);
        });
    };

    $scope.previousPage = function() {
        if ($scope.currentPage > 1) {
            $scope.currentPage--;
            $scope.getResults();
        }
    };

    $scope.nextPage = function() {
        if ($scope.currentPage < $scope.maxPages) {
            $scope.currentPage++;
            $scope.getResults();
        }
    };

    $scope.$watch('currentPage + numPerPage', function() {
        var begin = (($scope.currentPage - 1) * $scope.numPerPage)
        , end = begin + $scope.numPerPage;
      });

    
      
    $scope.getSizes();
});
