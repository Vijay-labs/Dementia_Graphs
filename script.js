document.addEventListener('DOMContentLoaded', function() {
    fetch('quiz_results.csv')
        .then(response => response.text())
        .then(csvText => {
            Papa.parse(csvText, {
                header: true,
                dynamicTyping: true,
                complete: (results) => {
                    processData(results.data);
                }
            });
        });

    let comparisonChartInstance; // Variable to hold the comparison chart instance

    function processData(data) {
        const userId = 101; // Assuming we are tracking a single user with ID 101
        const userResults = data.filter(row => row.user_id === userId);

        // Prepare data for overall improvement chart
        const overallImprovementData = {};
        userResults.forEach(row => {
            const { correctness, quiz_date } = row;
            if (!overallImprovementData[quiz_date]) {
                overallImprovementData[quiz_date] = { correct: 0, total: 0 };
            }
            overallImprovementData[quiz_date].correct += correctness ? 1 : 0;
            overallImprovementData[quiz_date].total++;
        });

        const overallLabels = Object.keys(overallImprovementData).sort((a, b) => new Date(a) - new Date(b));
        const overallDataset = overallLabels.map(date => (overallImprovementData[date].correct / overallImprovementData[date].total) * 100);

        // Create the overall improvement chart
        const overallCtx = document.getElementById('overallImprovementChart').getContext('2d');
        new Chart(overallCtx, {
            type: 'line',
            data: {
                labels: overallLabels,
                datasets: [{
                    label: 'Overall Improvement Over Time',
                    data: overallDataset,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    fill: true,
                }]
            },
            options: {
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Correctness (%)'
                        }
                    }
                }
            }
        });

        // Prepare data for weekly category improvement chart
        const weeklyCategoryData = {};
        userResults.forEach(row => {
            const { category, correctness, quiz_date } = row;
            const week = getWeekNumber(new Date(quiz_date));
            if (!weeklyCategoryData[week]) {
                weeklyCategoryData[week] = {};
            }
            if (!weeklyCategoryData[week][category]) {
                weeklyCategoryData[week][category] = { correct: 0, total: 0 };
            }
            weeklyCategoryData[week][category].correct += correctness ? 1 : 0;
            weeklyCategoryData[week][category].total++;
        });

        // Prepare data for the current week (last week in the data)
        const currentWeek = Math.max(...Object.keys(weeklyCategoryData).map(Number));
        const currentWeekData = weeklyCategoryData[currentWeek];
        const currentWeekLabels = Object.keys(currentWeekData);
        const currentWeekDataset = currentWeekLabels.map(category => (currentWeekData[category].correct / currentWeekData[category].total) * 100);

        const currentWeekColors = currentWeekDataset.map(percentage => {
            if (percentage >= 60) return 'rgba(75, 192, 192, 1)'; // Green
            if (percentage >= 35 && percentage < 60) return 'rgba(255, 206, 86, 1)'; // Amber
            return 'rgba(255, 99, 132, 1)'; // Red
        });

        // Create the weekly category improvement chart
        const weeklyCategoryCtx = document.getElementById('weeklyCategoryImprovementChart').getContext('2d');
        new Chart(weeklyCategoryCtx, {
            type: 'bar',
            data: {
                labels: currentWeekLabels,
                datasets: [{
                    label: `Week ${currentWeek} Improvement`,
                    data: currentWeekDataset,
                    backgroundColor: currentWeekColors,
                    borderColor: currentWeekColors,
                    borderWidth: 1,
                }]
            },
            options: {
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Category'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Correctness (%)'
                        }
                    }
                }
            }
        });

        // Populate category dropdown
        const categorySet = new Set(currentWeekLabels);
        const categorySelect = document.getElementById('categorySelect');
        categorySet.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.text = category;
            categorySelect.appendChild(option);
        });

        // Compare button functionality
        document.getElementById('compareButton').addEventListener('click', () => {
            const selectedCategory = categorySelect.value;
            const comparisonContainer = document.getElementById('comparisonContainer');
            comparisonContainer.style.display = 'block';

            // Prepare data for comparison
            const previousWeek = currentWeek - 1;
            const previousWeekData = weeklyCategoryData[previousWeek] || {};
            const selectedCategoryCurrentWeek = currentWeekData[selectedCategory] || { correct: 0, total: 0 };
            const selectedCategoryPreviousWeek = previousWeekData[selectedCategory] || { correct: 0, total: 0 };

            const comparisonLabels = [`Week ${previousWeek}`, `Week ${currentWeek}`];
            const comparisonDataset = [
                (selectedCategoryPreviousWeek.correct / selectedCategoryPreviousWeek.total) * 100 || 0,
                (selectedCategoryCurrentWeek.correct / selectedCategoryCurrentWeek.total) * 100 || 0
            ];

            const comparisonColors = comparisonDataset.map(percentage => {
                if (percentage >= 60) return 'rgba(75, 192, 192, 1)'; // Green
                if (percentage >= 35 && percentage < 60) return 'rgba(255, 206, 86, 1)'; // Amber
                return 'rgba(255, 99, 132, 1)'; // Red
            });

            // Destroy the previous comparison chart instance if it exists
            if (comparisonChartInstance) {
                comparisonChartInstance.destroy();
            }

            const comparisonCtx = document.getElementById('comparisonChart').getContext('2d');
            comparisonChartInstance = new Chart(comparisonCtx, {
                type: 'bar',
                data: {
                    labels: comparisonLabels,
                    datasets: [{
                        label: `Category ${selectedCategory} Improvement`,
                        data: comparisonDataset,
                        backgroundColor: comparisonColors,
                        borderColor: comparisonColors,
                        borderWidth: 1,
                    }]
                },
                options: {
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'Week'
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: 'Correctness (%)'
                            }
                        }
                    }
                }
            });
        });
    }

    // Function to get week number from a date
    function getWeekNumber(date) {
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
        return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    }
});
