public class DailyPlan{

    private final double dailyRate;

    public DailyPlan(double dailyRate){
        if (dailyRate<=0){
            throw new IllegalArgumentException("Daily rate must be positive");
        }
        this.dailyRate=dailyRate;
    }


    public double calculateAmount(long days){
        if(days<=0){
            throw new IllegalArgumentException("Days must be positive");
        }
        return dailyRate*days;        
    }



} 