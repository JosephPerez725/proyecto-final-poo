import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

public class RentalPeriod{
    private final LocalDate startDate;
    private final LocalDate endDate;

    public RentalPeriod(LocalDate startDate, LocalDate endDate){
        if (startDate == null){
            throw new IllegalArgumentException("Start date is required");
        }
        if (endDate == null){
            throw new IllegalArgumentException("End date is required");
        }
        if (!endDate.isAfter(startDate)){
            throw new IllegalArgumentException("End date must be after start date");
        }
        this.startDate = startDate;
        this.endDate = endDate;
    }

    public long getDays(){
        return ChronoUnit.DAYS.between(startDate, endDate);
    }

    public LocalDate getStartDate() {
    return startDate;
    }

    public LocalDate getEndDate() {
    return endDate;
    }



}